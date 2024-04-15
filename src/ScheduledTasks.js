/*
Global definition area of "Scheduled Tasks"
*/
import * as module_alarmline from 'Alarmline';


//Alarmfilter string for Alarmlines configured like Alarm Control Filter
export const alarmlineFilter = "AlarmClassName <> 'SystemNotification' AND AlarmClassName <> 'SystemAlarm' AND AlarmClassName <> 'SystemAlarmWithoutClearEvent' AND AlarmClassName <> 'SystemInformation' AND AlarmClassName <> 'SystemWarning' AND AlarmClassName <> 'SystemWarningWithoutClearEvent'";
let alMgr = undefined;

/**
* Task to update the alarms.
* This function is responsible for starting the alarm-subscription based on the system activation state.
*/
export function Task_AlarmUpdate_Update() {
  if (Tags('@SystemActivationState').Read() === 2) {
    //on startup, start the alarm subscription
    if (!alMgr) {
      alMgr = new module_alarmline.AlarmManager({
        language: 1033,
        filter: alarmlineFilter,
        sortOrderDescending: Tags('SortOrderDescending').Read(),
        callback: module_alarmline.UpdateActiveAlarms,
        delayInMilliseconds: 250
      });
      alMgr.StartSubscription();
    } else {
      //if alarm subscription was already started, update on the sort order
      alMgr.SetSortOrder(Tags('SortOrderDescending').Read());
    }
  }
}
