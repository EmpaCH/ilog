import { Link } from "@tanstack/react-router";
import { useGetLogbookCollection } from "../../apis/logbook/useLogbookCollection";
import { useIsAdmin } from "../../apis/user/useIsAdmin";

/**
 * Explains why the logbook can't be used when no logbook collection is set up or it no longer exists.
 * Admins get a link to the Settings page, other users are asked to contact an admin.
 * Renders nothing while loading or when the logbook collection works.
 *
 * Takes the logbook collection query of the page instead of querying it itself: this notice is only
 * mounted once the query failed, and mounting a new observer of a failed query refetches it, which
 * resets it to loading, hides the notice again and loops.
 */
export const LogbookSetupNotice = ({
  logbookCollection,
}: {
  logbookCollection: ReturnType<typeof useGetLogbookCollection>;
}) => {
  const { data: isAdmin } = useIsAdmin();

  const problem = logbookCollection.isError
    ? logbookCollection.error.message
    : logbookCollection.isSuccess && logbookCollection.data === null
      ? "The logbook is not set up yet: no collection to store the logbook entries in has been chosen."
      : null;
  if (!problem) {
    return null;
  }

  return (
    <p className={`text-center mt-12 ${logbookCollection.isError ? "text-danger" : "text-warning-600"}`}>
      {problem}<br/>
      {isAdmin ? (
        <Link to="/settings" className="text-blue-600 hover:underline">
          Choose the logbook collection in Settings.
        </Link>
      ) : (
        "Please contact an instance admin."
      )}
    </p>
  );
};
