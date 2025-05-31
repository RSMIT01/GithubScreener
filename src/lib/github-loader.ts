import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import { Document } from "@langchain/core/documents";
import { generateEmbedding, summarizeCode } from "./gemini";
import { db } from "@/server/db";
import { SourceCode } from "eslint";
import { Octokit } from "@octokit/rest";

const getFileCount = async (
  path: string,
  octokit: Octokit,
  githubOwner: string,
  githubRepo: string,
  acc: number = 0,
) => {
  const { data } = await octokit.rest.repos.getContent({
    owner: githubOwner,
    repo: githubRepo,
    path,
  });
  if (!Array.isArray(data) && data.type == "file") {
    return acc + 1;
  }
  if (Array.isArray(data)) {
    let filecount = 0;
    const directories: string[] = [];
    for (const item of data) {
      if (item.type === "dir") {
        directories.push(item.path);
      } else {
        filecount++;
      }
    }
    if (directories.length > 0) {
      const directoryCounts = await Promise.all(
        directories.map((dirpath) =>
          getFileCount(dirpath, octokit, githubOwner, githubRepo, 0),
        ),
      );
      filecount += directoryCounts.reduce((acc, count) => acc + count, 0);
    }
    return acc + filecount;
  }
  return acc;
};

export const checkCredits = async (githubUrl: string, githubToken?: string) => {
  const octokit = new Octokit({ auth: githubToken });
  const githubOwner = githubUrl.split("/")[3];
  const githubRepo = githubUrl.split("/")[4];
  if (!githubOwner || !githubRepo) return 0;
  const filecount = await getFileCount("", octokit, githubOwner, githubRepo, 0);
  return filecount;
};

export const loadGitubRepo = async (
  githubUrl: string,
  githubToken?: string,
) => {
  const loader = new GithubRepoLoader(githubUrl, {
    accessToken: githubToken || "",
    branch: "main",
    ignoreFiles: [
      "package-lock.json",
      "yarn.lock",
      "pnpm-lock.yaml",
      "bun.lockb",
    ],
    recursive: true,
    unknown: "warn",
    maxConcurrency: 5,
  });
  const docs = await loader.load();
  return docs;
};

export const indexGithubRepo = async (
  projectId: string,
  githubUrl: string,
  githubToken?: string,
) => {
  const docs = await loadGitubRepo(githubUrl, githubToken);
  const allEmbedings = await generateEmbeddings(docs);
  await Promise.allSettled(
    allEmbedings.map(async (embedding, index) => {
      if (!embedding) return;
      const SourceCodeEmbedding = await db.sourceCodeEmbedding.create({
        data: {
          summary: embedding.summary,
          sourceCode: embedding.sourcecode,
          fileName: embedding.fileName,
          projectId,
        },
      });
      await db.$executeRaw`UPDATE "SourceCodeEmbedding" SET "summaryEmbedding" = ${embedding.embedding}::vector WHERE "id"=${SourceCodeEmbedding.id}`;
    }),
  );
};

const generateEmbeddings = async (docs: Document[]) => {
  return await Promise.all(
    docs.map(async (doc) => {
      const summary = await summarizeCode(doc);
      const embedding = await generateEmbedding(summary);
      return {
        summary,
        embedding,
        sourcecode: JSON.parse(JSON.stringify(doc.pageContent)),
        fileName: doc.metadata.source,
      };
    }),
  );
};
