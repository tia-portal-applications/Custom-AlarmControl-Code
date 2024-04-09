/*
Global definition area of "Scheduled Tasks"
*/
import { AlarmManager } from 'Alarming';
let alMgr = undefined;
/**
* Task to update the alarms.
* This function is responsible for starting the alarm-subscription based on the system activation state.
*/
export function Task_AlarmsUpdate_Update() {
  if (Tags('@SystemActivationState').Read() === 2) {
    //on startup, start the alarm subscription
    if (!alMgr) {
      const alarmlineFilter = ''; //"AlarmClassName <> 'SystemNotification' AND AlarmClassName <> 'SystemAlarm' AND AlarmClassName <> 'SystemAlarmWithoutClearEvent' AND AlarmClassName <> 'SystemInformation' AND AlarmClassName <> 'SystemWarning' AND AlarmClassName <> 'SystemWarningWithoutClearEvent'";
      alMgr = new AlarmManager({
        language: 127, // default language
        filter: alarmlineFilter,
        sortOrderDescending: false,
        callback: (allAlarms) => { Tags('AlarmsCount').Write(allAlarms.length); },
        delayInMilliseconds: 250
      });
      alMgr.StartSubscription();
    }
  }
}
