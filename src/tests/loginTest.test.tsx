import {
  render,
  waitFor,
} from "@testing-library/react";
import { useContext } from "react";
import { expect, test, vi } from "vitest";
import { useGetAllObjectTypes } from "../apis/type/useGetAllObjectTypes";
import userEvent from "@testing-library/user-event";
import { openBISHookFactory } from "../hooks/auth/useAuth";
import { AuthContext } from "../context/auth/authContext";
import { storageMockFactory } from "./storageMock";
import TestWrapper from "./TestWrapper";
import TestComponent from "./TestComponent";

const url = "http://localhost:8082/openbis";
const apiFacade = openBISHookFactory(url);

vi.doMock("localStorage", storageMockFactory);

test("login twice gives the same token", async () => {
  const DataComponent = () => {
    const objectTypes = useGetAllObjectTypes();
    const auth = useContext(AuthContext);
    return (
      <div>
        <div aria-label="status">{objectTypes.status}</div>
        <div aria-label="objects">{objectTypes.data?.length}</div>
        <div aria-label="token">{auth.token}</div>
      </div>
    );
  };

  const pageFactory = () =>
    render(
      <TestComponent>
        <DataComponent />
      </TestComponent>,
      {
        wrapper: (children) =>
          TestWrapper({ children: children.children, apiFacade: apiFacade }),
      }
    );

  const result = pageFactory();
  // User interactions
  await userEvent.click(result.getByRole("button", { name: "Login" }));
  /// Wait for the init to complete
  await waitFor(() => {
    expect(result.getByLabelText("init-done").textContent).toContain("done");
  });
  const result1 = pageFactory();
  await waitFor(() => {
    expect(result.getByLabelText("token").textContent).toEqual(
      result1.getByLabelText("token").textContent
    );
  });
});
