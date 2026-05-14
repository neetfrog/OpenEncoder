import { useEncoderStore } from '../useEncoderStore';
import type { Preset } from '../../shared/types';

describe('useEncoderStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useEncoderStore.setState({
      jobs: [],
      selectedJobIds: new Set(),
      outputDir: '',
      concurrentJobs: 2,
    });
  });

  it('should initialize with default values', () => {
    const state = useEncoderStore.getState();
    expect(state.jobs).toEqual([]);
    expect(state.activeTab).toBe('queue');
    expect(state.concurrentJobs).toBe(2);
  });

  it('should add files to queue', () => {
    const store = useEncoderStore.getState();
    const paths = ['/test/file1.mp4', '/test/file2.mp4'];
    store.addFiles(paths);

    const state = useEncoderStore.getState();
    expect(state.jobs).toHaveLength(2);
    expect(state.jobs[0].inputPath).toBe('/test/file1.mp4');
    expect(state.jobs[0].status).toBe('pending');
  });

  it('should remove a job by id', () => {
    const store = useEncoderStore.getState();
    store.addFiles(['/test/file1.mp4', '/test/file2.mp4']);

    let state = useEncoderStore.getState();
    const jobId = state.jobs[0].id;

    store.removeJob(jobId);

    state = useEncoderStore.getState();
    expect(state.jobs).toHaveLength(1);
    expect(state.jobs[0].id).not.toBe(jobId);
  });

  it('should select and deselect jobs', () => {
    const store = useEncoderStore.getState();
    store.addFiles(['/test/file1.mp4', '/test/file2.mp4']);

    const state = useEncoderStore.getState();
    const [job1, job2] = state.jobs;

    store.selectJob(job1.id);
    let currentState = useEncoderStore.getState();
    expect(currentState.selectedJobIds.has(job1.id)).toBe(true);

    store.selectJob(job2.id, true); // multi-select
    currentState = useEncoderStore.getState();
    expect(currentState.selectedJobIds.size).toBe(2);

    store.selectJob(job1.id, true); // deselect
    currentState = useEncoderStore.getState();
    expect(currentState.selectedJobIds.size).toBe(1);
  });

  it('should clear done jobs', () => {
    const store = useEncoderStore.getState();
    store.addFiles(['/test/file1.mp4', '/test/file2.mp4']);

    let state = useEncoderStore.getState();
    const jobIds = state.jobs.map((j) => j.id);

    store.setJobStatus(jobIds[0], 'done');
    store.setJobStatus(jobIds[1], 'error');

    store.clearDoneJobs();

    state = useEncoderStore.getState();
    expect(state.jobs).toHaveLength(0);
  });

  it('should update job progress', () => {
    const store = useEncoderStore.getState();
    store.addFiles(['/test/file.mp4']);

    const state = useEncoderStore.getState();
    const jobId = state.jobs[0].id;

    store.updateJobProgress(jobId, 50, 25, '5000kbps', '00:01:30');

    const updated = useEncoderStore.getState();
    const job = updated.jobs[0];
    expect(job.progress).toBe(50);
    expect(job.currentFps).toBe(25);
    expect(job.currentBitrate).toBe('5000kbps');
    expect(job.status).toBe('encoding');
  });
});
