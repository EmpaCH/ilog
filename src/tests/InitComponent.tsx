import { ReactNode } from "@tanstack/react-router";
import { useInitIlog } from "../apis/shared/useInitIlog";
import { useEffect } from "react";

const InitComponent = ({ children }: { children: ReactNode }) => {
  const initResult = useInitIlog();
  useEffect(() => {
    initResult.mutate();
  }, []);
  if (initResult.status === "pending") {
    return <div>Loading...</div>;
  } else if (initResult.status === "error") {
    return <div>Error: {initResult.error.message}</div>;
  } else if (initResult.status === "success" && initResult.error === null) {
    return (
      <div>
        <h1 aria-label="init-done">done</h1>
        <div>
          {initResult.error}
          <div />
          {children}
        </div>
        ;
      </div>
    );
  }
};

export default InitComponent;
