import { observer } from "mobx-react";
import { DollarSign } from "lucide-react";

import { useIssueDetail } from "@/hooks/store/use-issue-detail";

import { IssueActivityBlockComponent, IssueLink } from "./";

type TIssueBudgetActualActivity = {
  activityId: string;
  showIssue?: boolean;
  ends: "top" | "bottom" | undefined;
};

export const IssueBudgetActualActivity = observer(function IssueBudgetActualActivity(
  props: TIssueBudgetActualActivity
) {
  const { activityId, showIssue = true, ends } = props;

  const {
    activity: { getActivityById },
  } = useIssueDetail();

  const activity = getActivityById(activityId);

  if (!activity) return <></>;

  const hasValue =
    activity.new_value !== null && activity.new_value !== undefined;

  return (
    <IssueActivityBlockComponent
      icon={<DollarSign size={14} className="text-secondary" aria-hidden="true" />}
      activityId={activityId}
      ends={ends}
    >
      <>
        {hasValue ? `set actual cost to ` : `removed actual cost `}
        {hasValue && (
          <span className="font-medium text-primary">
            {activity.new_value}
          </span>
        )}
        {showIssue && (hasValue ? ` for ` : ` from `)}
        {showIssue && <IssueLink activityId={activityId} />}.
      </>
    </IssueActivityBlockComponent>
  );
});