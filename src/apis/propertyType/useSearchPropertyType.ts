import { useQuery } from "@tanstack/react-query";
import { getPropertyType } from "./propertyTypeAPI";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";

const QUERY_PREFIX = "SEARCH_PROPERTY_TYPE";
export const useSearchPropertyType = (code: string) => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: [QUERY_PREFIX, code],
    queryFn: async () => {
      const res = await getPropertyType(apiFacade, code);
      if (res === null || res === undefined) {
        // throw new Error("Property type not found");
        console.log('Could not find property.');        
      }
      return res;
    },
  });
};
