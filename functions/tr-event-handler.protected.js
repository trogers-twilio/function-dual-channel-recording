const EventTypes = {
  reservationAccepted: 'reservation.accepted',
  reservationCreated: 'reservation.created',
  reservationCanceled: 'reservation.canceled',
  reservationTimeout: 'reservation.timeout',
  reservationRejected: 'reservation.rejected'
}

const handleReservationCreated = async (context, event) => {
  const client = require('twilio')(context.ACCOUNT_SID, context.AUTH_TOKEN);
  const taskSid = event.TaskSid;
  const taskAttributes = event.TaskAttributes && JSON.parse(event.TaskAttributes);
  if (!taskAttributes) {
    console.log('No task attributes on event. Unable to proceed.');
    return;
  }
  const callSid = taskAttributes.call_sid;
  if (!callSid) {
    console.log('No call SID on task attributes. Unable to proceed.');
    return;
  }
  const { recording } = taskAttributes;
  if (recording && recording.sid) {
    console.log('Recording already started. Nothing further to do.');
    return;
  }
  const newRecording = await client.calls(callSid)
    .recordings
    .create({
      recordingChannels: 'dual',
      recordingStatusCallback: `https://${context.DOMAIN_NAME}/recording-event-handler?TaskSid=${taskSid}`,
      recordingStatusCallbackEvent: 'completed'
    });
  console.log('New recording created:', newRecording.sid);
  const updatedTaskAttributes = {
    ...taskAttributes,
    recording: {
      sid: newRecording.sid
    }
  };
  await client.taskrouter
    .workspaces(context.WORKSPACE_SID)
    .tasks(taskSid)
    .update({
      attributes: JSON.stringify(updatedTaskAttributes)
    });
  console.log('Task updated with recording SID');
}

exports.handler = async function(context, event, callback) {
  const eventType = event.EventType;
  const taskAttributes = event.TaskAttributes && JSON.parse(event.TaskAttributes);
  const callSid = taskAttributes && taskAttributes.call_sid;

  console.log(`${(new Date()).toISOString()}: ${eventType} for call ${callSid}`);

  switch (eventType) {
    case EventTypes.reservationCreated: {
      if (callSid) {
        await handleReservationCreated(context, event);
      }
      break;
    }
    default: {
      // Nothing to do here
    }
  }

  callback(null, {});
};
