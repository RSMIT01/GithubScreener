"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useRefetch from "@/hooks/use-refetch";
import { api } from "@/trpc/react";
import { Info } from "lucide-react";
import React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type FormInput = {
  repoURL: string;
  projectName: string;
  githubToken?: string;
};

const Createpage = () => {
  const { register, handleSubmit, reset } = useForm<FormInput>();
  const createProjet = api.project.createProject.useMutation();

  const checkCredits = api.project.checkCredits.useMutation();

  const refetch = useRefetch();
  const onSubmit = (data: FormInput) => {
    if (!!checkCredits.data) {
      createProjet.mutate(
        {
          githubUrl: data.repoURL,
          name: data.projectName,
          githubToken: data.githubToken,
        },
        {
          onSuccess: () => {
            toast.success("Project created successfully.");
            refetch();
            reset();
          },
          onError: () => {
            toast.error("Failed to create project.");
          },
        },
      );
    } else {
      checkCredits.mutate({
        githubUrl: data.repoURL,
        githubToken: data.githubToken,
      });
    }
  };
  const hasEnoughCredits = checkCredits?.data?.userCredits
    ? checkCredits.data.filecount <= checkCredits.data.userCredits
    : true;
  return (
    <div className="flex h-full items-center justify-center gap-12">
      <img src="/github_scan.png" className="h-56 w-auto" />
      <div>
        <div>
          <h1 className="text-2xl font-semibold">
            Provide Your Github Repository
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter the URL of your repository to link it to Github Screener
          </p>
        </div>
        <div className="h-4"></div>
        <div>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Input
              {...register("projectName", { required: true })}
              placeholder="Project Name"
              required
            />
            <div className="h-2"></div>
            <Input
              {...register("repoURL", { required: true })}
              placeholder="GitHub Url"
              type="url"
              required
            />
            <div className="h-2"></div>
            <Input
              {...register("githubToken")}
              placeholder="GitHub Token (Optional)"
            />
            <div className="h-4"></div>
            {!!checkCredits.data && (
              <>
                <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-blue-700">
                  <div className="flex items-center gap-2">
                    <Info className="size-4" />
                    <p className="text-sm">
                      You will be charged{" "}
                      <strong>
                        {checkCredits.data?.filecount} credits for this
                        repository to index.
                      </strong>
                    </p>
                  </div>
                  <p className="text-sm">
                    You have{" "}
                    <strong>
                      {checkCredits.data?.userCredits} credits remaining.
                    </strong>
                  </p>
                </div>
              </>
            )}
            <div className="h-4"></div>
            <Button
              type="submit"
              disabled={
                createProjet.isPending ||
                checkCredits.isPending ||
                !hasEnoughCredits
              }
            >
              {!!checkCredits.data ? "Create Project" : "Check Credits"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Createpage;
