const RecordingStatuses = {
  completed: 'completed'
};

const handleRecordingCompleted = async (context, event) => {
  const client = require('twilio')(context.ACCOUNT_SID, context.AUTH_TOKEN);
  const taskSid = event.TaskSid;
  const recordingUrl = event.RecordingUrl;

  const task = await client.taskrouter
    .workspaces(context.WORKSPACE_SID)
    .tasks(taskSid)
    .fetch();
  const taskAttributes = task && task.attributes && JSON.parse(task.attributes);
  if (!taskAttributes) {
    console.error('Unable to fetch task attributes to update task with recording segment link.');
    return;
  }
  const updatedTaskAttributes = {
    ...taskAttributes,
    conversations: {
      ...taskAttributes.conversations,
      segment_link: recordingUrl
    }
  };
  await client.taskrouter
    .workspaces(context.WORKSPACE_SID)
    .tasks(taskSid)
    .update({
      attributes: JSON.stringify(updatedTaskAttributes)
    });
  console.log('Task updated with recording URL');
}

exports.handler = async function(context, event, callback) {
  const recordingStatus = event.RecordingStatus;
  const callSid = event.CallSid
  console.log(`${(new Date()).toISOString()}: Recording ${recordingStatus} for call ${callSid}`);


  switch (recordingStatus) {
    case RecordingStatuses.completed: {
      await handleRecordingCompleted(context, event);
      break;
    }
    default: {
      // Nothing to do here
    }
  }

  callback(null, {});
};