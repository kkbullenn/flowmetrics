import axios from 'axios';

const BASE_URL = '/api/metrics';

export const getRepositories = () =>
    axios.get(`${BASE_URL}/repositories`).then(r => r.data);

export const getLatestSnapshots = (repoId) =>
    axios.get(`${BASE_URL}/snapshots/latest`, { params: { repoId } }).then(r => r.data);

export const getSnapshots = (repoId, window = 'last_30_days') =>
    axios.get(`${BASE_URL}/snapshots`, { params: { repoId, window } }).then(r => r.data);