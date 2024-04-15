/*
Global definition area of module "Alarming"
*/
/**
 * Options of the Alarm Manager.
 */
class Options {
  language = 127;
  filter = '';
  sortOrderDescending = false;
  delayInMilliseconds = 250;
  constructor(options) {
    this.language = options.language ?? this.language; // 127 is default language
    this.filter = options.filter ?? this.filter;
    this.sortOrderDescending = options.sortOrderDescending ?? this.sortOrderDescending;
    this.callback = options.callback;
    this.delayInMilliseconds = options.delayInMilliseconds ?? this.delayInMilliseconds;
    if (this.delayInMilliseconds < 250) {
      this.delayInMilliseconds = 250; // 250 milliseconds is minimum.
    }
  }
}

/**
* Represents an Alarm Manager.
*/
export class AlarmManager {
  /**
  * Creates an instance of AlarmManager.
  *
  * Possible options are:
  * {
      language: (Number) The language code (LCID) for the alarms,
      filter: Alarm filter string,
      sortOrderDescending: sort order of the modifications time,
      callback: function callback to update the alarms, the parameter of the callback is an array of alarms
      delayInMilliseconds: the delay in milliseconds until new alarms will be sent to the callback. Minimum is 250
  }
  *
  * @param {object} options - The options for the AlarmManager.
  */
  #options = new Options({});
  #alarms = new Map();
  #subscription;
  #throttledSendUpdate;
  #hasChanged = false;
  /**
   *
   * @param {Options} options Possible options are:
  * {
      language: (Number) The language code (LCID) for the alarms,
      filter: Alarm filter string,
      sortOrderDescending: sort order of the modifications time,
      callback: function callback to update the alarms, the parameter of the callback is an array of alarms
      delayInMilliseconds: the delay in milliseconds until new alarms will be sent to the callback. Minimum is 250
  }
   */
  constructor(options) {
    this.#options = new Options(options);
  }
  /**
  * Starts the alarm subscription.
  * @throws {Error} Throws an error if the subscription is already started.
  */
  StartSubscription() {
    if (this.#subscription !== undefined) {
      throw new Error('Subscription already started');
    }
    this.#subscription = HMIRuntime.Alarming.CreateSubscription();
    this.#subscription.Language = this.#options.language;
    this.#subscription.Filter = this.#options.filter;
    this.#subscription.OnAlarm = (err, sys, alarms) => {
      for (const al of alarms) {
        const alkey = `${al.Name}_${al.InstanceID}`;
        switch (al.NotificationReason) {
        case 1:
          this.#alarms.set(alkey, al);
          break;
        case 2:
          this.#alarms.set(alkey, al);
          break;
        case 3:
          this.#alarms.delete(alkey);
          break;
        default:
          break;
        }
      }
      this.#hasChanged = true;
      this.#throttledSendUpdate();
    };
    this.#alarms.clear();
    //clear all alarms initially
    this.#sendUpdate();
    //send updates to the client only every 250ms
    this.#throttledSendUpdate = this.#throttle(this.#options.delayInMilliseconds);
    this.#subscription.Start();
  }
  /**
  * Sets the sort order for the alarms.
  * @param {boolean} sortOrderDescending - The sort order. True for descending, false for ascending.
  */
  SetSortOrder(sortOrderDescending) {
    this.#options.sortOrderDescending = sortOrderDescending;
    this.#sendUpdate();
  }
  /**
  * Stops the alarm subscription.
  */
  StopSubscription() {
    if (this.#subscription !== undefined) {
      this.#subscription.Stop();
      this.#subscription = undefined;
      this.#alarms.clear();
      this.#hasChanged = false;
      this.#throttledSendUpdate = undefined;
    }
  }
  /**
  * Sends the alarm update to the callback function.
  * @private
  */
  #sendUpdate() {
    let alarmArray = Array.from(this.#alarms.values())
      .sort((a, b) => {
        if (this.#options.sortOrderDescending) {
          return b.ModificationTime - a.ModificationTime;
        }
        return a.ModificationTime - b.ModificationTime;
      })
      .slice(0, this.#options.maxAlarms);
    this.#options.callback(alarmArray);
  }

  /**
   * Throttling is a technique that limits how often a function can be called in a given period of time.
   * See https://dev.to/jeetvora331/throttling-in-javascript-easiest-explanation-1081
   * @param {number} delay define the delay in milliseconds between two functions
   * @returns new function that wraps the mainFunction including the delay at the end
   */
  #throttle(delay) {
    let timerFlag = null; // Variable to keep track of the timer

    // Returning a throttled version
    return () => {
      if (timerFlag === null) { // If there is no timer currently running
        this.#sendUpdate(); // Execute the send update
        timerFlag = HMIRuntime.Timers.SetTimeout(() => { // Set a timer to clear the timerFlag after the specified delay
          timerFlag = null; // Clear the timerFlag to allow the main function to be executed again
          if (this.#hasChanged) { // if a change occurred in the meantime, it must be sent to the visualization, too.
            this.#hasChanged = false;
            this.#throttledSendUpdate();
          }
        }, delay);
      }
    };
  }
}

/*
Global definition area of module "Alarmline"
*/
//Number of configured Alarmline tags. When maxAlarmLineAlarms is increased also tagSetTags needs to extend
const maxAlarmLineAlarms = 3;
const tagSetTags = ['Alarm1_DateTimeRaised', 'Alarm1_AlarmText', 'Alarm1_MachineUnitAssyPart', 'Alarm1_Status', 'Alarm1_Address', 'Alarm1_BackColor', 'Alarm1_TextColor', 'Alarm1_Flashing',
  'Alarm2_DateTimeRaised', 'Alarm2_AlarmText', 'Alarm2_MachineUnitAssyPart', 'Alarm2_Status', 'Alarm2_Address', 'Alarm2_BackColor', 'Alarm2_TextColor', 'Alarm2_Flashing',
  'Alarm3_DateTimeRaised', 'Alarm3_AlarmText', 'Alarm3_MachineUnitAssyPart', 'Alarm3_Status', 'Alarm3_Address', 'Alarm3_BackColor', 'Alarm3_TextColor', 'Alarm3_Flashing'];
/**
* Updates the alarm tags based on the provided array of alarms.
* @param {Array} allAlarms - The array of alarms to update the tags with.
*/


export function UpdateActiveAlarms(allAlarms) {
  let alarmIndex = allAlarms.length;
  const tagSet = Tags.CreateTagSet(tagSetTags);
  for (let index = 1; index <= maxAlarmLineAlarms; index++) {
    const prefixTagName = 'Alarm' + index;
    if (index <= allAlarms.length) {
      alarmIndex = index - 1;
      tagSet(prefixTagName + '_DateTimeRaised').Value = allAlarms[alarmIndex].RaiseTime;
      tagSet(prefixTagName + '_AlarmText').Value = allAlarms[alarmIndex].EventText;
      tagSet(prefixTagName + '_MachineUnitAssyPart').Value = allAlarms[alarmIndex].EventText;
      tagSet(prefixTagName + '_Status').Value = allAlarms[alarmIndex].AlarmText[0];
      tagSet(prefixTagName + '_Address').Value = allAlarms[alarmIndex].AlarmText[1];
      tagSet(prefixTagName + '_BackColor').Value = allAlarms[alarmIndex].BackColor;
      tagSet(prefixTagName + '_TextColor').Value = allAlarms[alarmIndex].TextColor;
      tagSet(prefixTagName + '_Flashing').Value = allAlarms[alarmIndex].Flashing;
    } else {
      tagSet(prefixTagName + '_DateTimeRaised').Value = new Date(0);
      tagSet(prefixTagName + '_AlarmText').Value = '';
      tagSet(prefixTagName + '_MachineUnitAssyPart').Value = '';
      tagSet(prefixTagName + '_Status').Value = '';
      tagSet(prefixTagName + '_Address').Value = '';
      tagSet(prefixTagName + '_BackColor').Value = HMIRuntime.Math.RGB(255, 255, 255);
      tagSet(prefixTagName + '_TextColor').Value = HMIRuntime.Math.RGB(255, 255, 255);
      tagSet(prefixTagName + '_Flashing').Value = false;
    }
  }
  tagSet.Write();
}
