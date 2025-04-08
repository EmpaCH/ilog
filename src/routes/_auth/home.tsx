import { createFileRoute } from "@tanstack/react-router";
import { useGetCurrentUser } from "../../apis/user/useGetCurrentUser";
import { current } from "immer";

export const Route = createFileRoute("/_auth/home")({
  component: () => {
    const {
      data: curentUser,
      isLoading,
      isError,
      error,
      isSuccess,
    } = useGetCurrentUser();
    if (isLoading) {
      return <div>Loading...</div>;
    }
    if (isError) {
      return <div>Error: {error.message}</div>;
    }
    if (isSuccess) {
      console.log("User is logged in, redirecting to /home");

      return (
        <>
          <h2>Welcome, {JSON.stringify(curentUser[0].getUserId())} &#128075;</h2>
        </>
      );
    }
  },
});
