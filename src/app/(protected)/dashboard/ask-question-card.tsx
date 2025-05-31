"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MDEditor from "@uiw/react-md-editor";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import useProject from "@/hooks/use-project";
import React, { useState } from "react";
import {
  Dialog,
  DialogHeader,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";
import { askQuestion } from "./actions";
import { readStreamableValue } from "ai/rsc";
import CodeReferences from "./code-references";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import useRefetch from "@/hooks/use-refetch";

const  AskQuestionCard = () => {
  const { project } = useProject();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [filesReferences, setFileReferences] = useState<
    { fileName: string; sourceCode: string; summary: string }[]
  >([]);
  const [answer, setAnswer] = useState("");
  const saveAnswer = api.project.saveAnswer.useMutation();
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setAnswer("");
    setFileReferences([]);
    e.preventDefault();
    if (!project?.id) return;
    setLoading(true);
    const { output, filesReferences } = await askQuestion(question, project.id);
    setOpen(true);
    setFileReferences(filesReferences);

    for await (const delta of readStreamableValue(output)) {
      if (delta) {
        setAnswer((ans) => ans + delta);
      }
    }
    setLoading(false);
  };
  const refetch = useRefetch()
  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[80vw]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>
                <Image src="/logo.png" alt="AI logo" width={40} height={40} />
              </DialogTitle>
              <Button
                disabled={saveAnswer.isPending}
                variant={"outline"}
                onClick={() =>
                  saveAnswer.mutate(
                    {
                      projectId: project!.id,
                      question,
                      answer,
                      filesReferences,
                    },
                    {
                      onSuccess: () => {
                        toast.success("Answer Saved!");
                        refetch()
                      },
                      onError: () => {
                        toast.error("Failed to Save Answer!");
                      },
                    },
                  )
                }
              >
                Save Answer
              </Button>
            </div>
          </DialogHeader>
          <MDEditor.Markdown
            source={answer}
            className="!h-full max-h-[28vh] max-w-[70vw] overflow-scroll !bg-white !text-gray-950"
          />
          <div className="h-4"></div>
          <CodeReferences fileReferences={filesReferences} />
          <Button
            type="button"
            onClick={() => {
              setOpen(false);
            }}
          >
            Close
          </Button>
        </DialogContent>
      </Dialog>
      <Card className="relative col-span-5">
        <CardHeader>
          <CardTitle>Ask a Question</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <Textarea
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="which file should contain code to fetch data?"
            />
            <div className="h-4"></div>

            <Button type="submit" disabled={loading}>
              Ask Screener
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
};

export default AskQuestionCard;
