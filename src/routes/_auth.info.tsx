import { createFileRoute, redirect } from "@tanstack/react-router";
import UserInfo from "../auth/components/UserInfo";
import { useContext } from "react";
import { LoginContext } from "../auth/LoginContext";

export const Route = createFileRoute("/_auth/info")({
  component: () => UserInfo(),
});
