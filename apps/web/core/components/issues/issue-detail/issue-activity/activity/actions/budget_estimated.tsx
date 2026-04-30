import { observer } from "mobx-react";
import { DollarSign } from "lucide-react";

import { useIssueDetail } from "@/hooks/store/use-issue-detail";

import { IssueActivityBlockComponent, IssueLink } from "./";

type TIssueBudgetEstimatedActivity = {
  activityId: string;
  showIssue?: boolean;
  ends: "top" | "bottom" | undefined;
};

export const IssueBudgetEstimatedActivity = observer(function IssueBudgetEstimatedActivity(
  props: TIssueBudgetEstimatedActivity
) {
  const { activityId, showIssue = true, ends } = props;

  const {
    activity: { getActivityById },
  } = useIssueDetail();

  const activity = getActivityById(activityId);

  if (!activity) return <></>;

  return (
    <IssueActivityBlockComponent
      icon={<DollarSign size={14} className="text-secondary" aria-hidden="true" />}
      activityId={activityId}
      ends={ends}
    >
      <>
        {activity.new_value ? `set planned cost to ` : `removed planned cost `}
        {activity.new_value && (
          <span className="font-medium text-primary">
            {activity.new_value}
          </span>
        )}
        {showIssue && (activity.new_value ? ` for ` : ` from `)}
        {showIssue && <IssueLink activityId={activityId} />}.
      </>
    </IssueActivityBlockComponent>
  );
});