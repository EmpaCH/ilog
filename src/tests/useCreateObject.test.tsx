import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import {
  act,
  render,
  renderHook,
  waitFor,
  screen,
} from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { useGetAllObjectTypes } from "../apis/type/useGetAllObjectTypes";
import userEvent from "@testing-library/user-event";
import { openBISHookFactory, useOpenBIS } from "../hooks/auth/useAuth";
import { AuthContext } from "../context/auth/authContext";
import openbis from "@openbis/openbis.esm"; // Ensure correct import
import { useSearch } from "@tanstack/react-router";
import {
  useEffect,
  useState,
  ReactElement,
  ReactNode,
  useContext,
} from "react";
import { useGetProjects } from "../apis/project/useGetProjects";
import { storageMockFactory } from "./storageMock";
import {
  INSTRUMENT_TYPE_DEFINITION,
  iLogGeneralInfoGroup,
} from "../apis/shared/types";
import { L } from "vitest/dist/chunks/reporters.6vxQttCV.js";
import { getObjectTypes } from "../apis/type/typeAPI";
import { useGetSpaces } from "../apis/space/useGetSpaces";
import TestWrapper from "./TestWrapper";
import Login from "./Login";
import TestComponent from "./TestComponent";
import { useCreateObjectType } from "../apis/type/useCreateObjectType";

const url = "http://localhost:8082/openbis";
const apiFacade = openBISHookFactory(url);

vi.doMock("localStorage", storageMockFactory);

test("useCreateObjectType", async () => {
  const newCode = Math.random().toString(36).substring(7).toUpperCase();
  const DataComponent = () => {
    const [codes, setCodes] = useState<string[]>([]);
    const creation = useCreateObjectType();
    const objectTypes = useGetAllObjectTypes();
    const def = INSTRUMENT_TYPE_DEFINITION;
    def.code = newCode;

    const handleClick = async () => {
      await creation.mutateAsync({ definition: def });
      const res = await objectTypes.refetch();
      const newCodes = res.data?.map((it) => it.getCode());
      setCodes(newCodes);
    };

    return (
      <div>
        <h1>Test</h1>
        <button onClick={handleClick}>Create</button>
        <div aria-label="status">{creation.status}</div>
        <ul aria-label="objects">
          {codes.map((it) => (
            <li>{it}</li>
          ))}
        </ul>
      </div>
    );
  };

  const result = render(
    <TestComponent>
      <DataComponent />
    </TestComponent>,
    {
      wrapper: (children) =>
        TestWrapper({ children: children.children, apiFacade: apiFacade }),
    }
  );
  // User interactions
  await userEvent.click(result.getByRole("button", { name: "Login" }));
  await waitFor(() => {
    expect(result.getByText("Test")).toBeDefined();
  });
  await userEvent.click(result.getByRole("button", { name: "Create" }));
  // Assertions
  await waitFor(() => {
    expect(result.getByLabelText("status").textContent).toContain("success");
  });

  await waitFor(() => {
    expect(result.getByLabelText("objects").textContent).toContain(newCode);
  });
});
