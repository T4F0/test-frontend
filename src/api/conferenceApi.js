import { getAuthAxios } from "./authApi";

import { API_BASE } from './config'

export const createConference = async (meetingId) => {
  const authAxios = getAuthAxios();
  const { data } = await authAxios.post(`${API_BASE}/conferences/`, {
    meeting: meetingId,
  });
  return data;
};

export const getConference = async (id) => {
  const authAxios = getAuthAxios();
  const { data } = await authAxios.get(`${API_BASE}/conferences/${id}/`);
  return data;
};

export const getConferenceByRoom = async (roomId) => {
  const authAxios = getAuthAxios();
  const { data } = await authAxios.get(
    `${API_BASE}/conferences/room/${roomId}/`,
  );
  return data;
};

export const joinConference = async (id) => {
  const authAxios = getAuthAxios();
  const { data } = await authAxios.post(`${API_BASE}/conferences/${id}/join/`);
  return data;
};

export const leaveConference = async (id) => {
  const authAxios = getAuthAxios();
  const { data } = await authAxios.post(`${API_BASE}/conferences/${id}/leave/`);
  return data;
};

export const startConference = async (id) => {
  const authAxios = getAuthAxios();
  const { data } = await authAxios.post(`${API_BASE}/conferences/${id}/start/`);
  return data;
};

export const endConference = async (id) => {
  const authAxios = getAuthAxios();
  const { data } = await authAxios.post(`${API_BASE}/conferences/${id}/end/`);
  return data;
};

export const addParticipant = async (
  conferenceId,
  userId,
  role = "PARTICIPANT",
) => {
  const authAxios = getAuthAxios();
  const { data } = await authAxios.post(
    `${API_BASE}/conferences/${conferenceId}/add-participant/`,
    {
      user_id: userId,
      role,
    },
  );
  return data;
};

export const removeParticipant = async (conferenceId, userId) => {
  const authAxios = getAuthAxios();
  const { data } = await authAxios.post(
    `${API_BASE}/conferences/${conferenceId}/remove-participant/`,
    {
      user_id: userId,
    },
  );
  return data;
};

export const muteParticipant = async (conferenceId, userId) => {
  const authAxios = getAuthAxios();
  const { data } = await authAxios.post(
    `${API_BASE}/conferences/${conferenceId}/mute-participant/`,
    {
      user_id: userId,
    },
  );
  return data;
};

export const getChatHistory = async (conferenceId) => {
  const authAxios = getAuthAxios();
  const { data } = await authAxios.get(
    `${API_BASE}/conferences/${conferenceId}/chat-history/`,
  );
  return data;
};

export const uploadConferenceAttachment = async (
  conferenceId,
  file,
  description = "",
  submissionId = null,
  signal = null
) => {
  const authAxios = getAuthAxios();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("description", description);
  if (submissionId) {
    formData.append("submission_id", submissionId);
  }
  const { data } = await authAxios.post(
    `${API_BASE}/conferences/${conferenceId}/upload-attachment/`,
    formData,
    { signal }
  );
  return data;
};

export const updateConferenceNotes = async (conferenceId, notes) => {
  const authAxios = getAuthAxios();
  const { data } = await authAxios.patch(
    `${API_BASE}/conferences/${conferenceId}/notes/`,
    {
      notes,
    },
  );
  return data;
};

export const promoteConferenceAttachment = async (conferenceId, attachmentId, submissionId) => {
  const authAxios = getAuthAxios();
  const { data } = await authAxios.post(
    `${API_BASE}/conferences/${conferenceId}/promote-attachment/`,
    {
      attachment_id: attachmentId,
      submission_id: submissionId,
    },
  );
  return data;
};
