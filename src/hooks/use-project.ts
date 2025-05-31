import { api } from "@/trpc/react";
import React from "react";
import { useLocalStorage } from "usehooks-ts";

const useProject = () => {
  const { data: projects } = api.project.getProjects.useQuery();
  const [projectId, setProjectId] = useLocalStorage("github-screener", "");
  const project = projects?.find((project) => project.id === projectId);
  return {
    projects,
    setProjectId,
    projectId,
    project
  };
};

export default useProject;
