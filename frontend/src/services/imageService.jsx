import API from './api';

export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);

  const res = await API.post('/images/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }, // <-- Must be explicit
  });
  return res.data;
};

export const applyTransform = async (projectId, algorithm) => {
    // Ensure this routes to /images/transform
    const res = await API.post('/images/transform', { projectId, algorithm });
    return res.data;
};