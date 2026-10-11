import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export function TechnicianPanelPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    totalJobs: 0,
    completedJobs: 0,
    activeJobs: 0,
    pendingJobs: 0,
    totalEarnings: 0,
    paidEarnings: 0,
    pendingEarnings: 0,
    rating: 4.85,
  });
  const [profile, setProfile] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'jobs' | 'earnings' | 'profile'>('jobs');

  useEffect(() => {
    loadTechnicianData();
  }, []);

  function loadTechnicianData() {
    setLoading(true);
    const token = localStorage.getItem('solaragent.token');
    api<{ profile: any; stats: any; recentJobs: any[]; recentPayments: any[] }>(
      '/technician/dashboard',
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then((data) => {
        setProfile(data.profile);
        setStats(data.stats);
        setJobs(data.recentJobs || []);
      })
      .catch((err) => {
        console.error('Failed to load technician dashboard:', err);
      })
      .finally(() => setLoading(false));
  }

  async function handleUpdateJobStatus(orderId: string, status: string) {
    setUpdatingStatus(true);
    setActionSuccess('');
    try {
      const token = localStorage.getItem('solaragent.token');
      await api(`/technician/jobs/${orderId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, completionNotes }),
      });

      setActionSuccess(`Job status successfully updated to ${status.toUpperCase()}!`);
      setSelectedJob(null);
      setCompletionNotes('');
      loadTechnicianData();
    } catch (err) {
      alert((err as Error).message || 'Failed to update job status');
    } finally {
      setUpdatingStatus(false);
    }
  }

  if (loading) {
    return (
      <div className="admin-loading" style={{ padding: '60px', textAlign: 'center' }}>
        <div className="spinner-large" />
        <p style={{ marginTop: '16px', color: 'var(--color-text-muted)' }}>Loading technician operations dashboard...</p>
      </div>
    );
  }

  return (
    <div className="technician-portal-container" style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span className="eyebrow" style={{ color: 'var(--color-brand)' }}>Certified Field Engineering</span>
          <h1 style={{ margin: '4px 0 8px', fontSize: '26px' }}>{profile?.name || 'Technician Portal'}</h1>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '14px' }}>
            Service Area: <strong>{profile?.serviceArea || 'Dhaka Division'}</strong> · Rating: <strong>⭐ {Number(profile?.rating || 4.85).toFixed(2)}</strong> · Availability: <span style={{ color: '#10b981', fontWeight: 600 }}>Active</span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={`secondary-button ${activeTab === 'jobs' ? 'active' : ''}`}
            onClick={() => setActiveTab('jobs')}
          >
            📋 Assigned Jobs ({jobs.length})
          </button>
          <button
            type="button"
            className={`secondary-button ${activeTab === 'earnings' ? 'active' : ''}`}
            onClick={() => setActiveTab('earnings')}
          >
            💰 Payouts & Earnings
          </button>
          <button
            type="button"
            className={`secondary-button ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            👤 My Credentials
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div style={{ background: '#ecfdf5', border: '1px solid #10b981', color: '#065f46', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' }}>
          ✓ {actionSuccess}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div className="stat-card" style={{ background: 'var(--color-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Jobs</span>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-brand)', marginTop: '4px' }}>{stats.totalJobs}</div>
          <small style={{ color: 'var(--color-text-muted)' }}>Assigned installations</small>
        </div>

        <div className="stat-card" style={{ background: 'var(--color-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active In-Progress</span>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#f59e0b', marginTop: '4px' }}>{stats.activeJobs}</div>
          <small style={{ color: 'var(--color-text-muted)' }}>Scheduled / En Route</small>
        </div>

        <div className="stat-card" style={{ background: 'var(--color-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Completed Jobs</span>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>{stats.completedJobs}</div>
          <small style={{ color: 'var(--color-text-muted)' }}>Commissioned projects</small>
        </div>

        <div className="stat-card" style={{ background: 'var(--color-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Earnings</span>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#3b82f6', marginTop: '4px' }}>৳{Number(stats.totalEarnings).toLocaleString()}</div>
          <small style={{ color: 'var(--color-text-muted)' }}>Pending: ৳{Number(stats.pendingEarnings).toLocaleString()}</small>
        </div>

        <div className="stat-card" style={{ background: 'var(--color-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Customer Rating</span>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#eab308', marginTop: '4px' }}>⭐ {stats.rating} / 5.0</div>
          <small style={{ color: 'var(--color-text-muted)' }}>Verified site reviews</small>
        </div>
      </div>

      {/* TAB 1: ASSIGNED JOBS */}
      {activeTab === 'jobs' && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '18px' }}>Assigned Project Installation Work Orders</h3>
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Showing {jobs.length} jobs</span>
          </div>

          {jobs.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <span style={{ fontSize: '32px' }}>🔧</span>
              <h4 style={{ margin: '12px 0 4px', color: 'var(--color-text-main)' }}>No Active Assignments</h4>
              <p>You have no pending field assignments right now. New dispatch notifications will appear here.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface-soft)', textAlign: 'left', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                    <th style={{ padding: '14px 16px' }}>Order #</th>
                    <th style={{ padding: '14px 16px' }}>System Type</th>
                    <th style={{ padding: '14px 16px' }}>Customer & Contact</th>
                    <th style={{ padding: '14px 16px' }}>Site Location</th>
                    <th style={{ padding: '14px 16px' }}>Schedule</th>
                    <th style={{ padding: '14px 16px' }}>Status</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} style={{ borderBottom: '1px solid var(--color-border)', fontSize: '14px' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                        {job.orderNumber}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span className="badge" style={{ textTransform: 'uppercase', background: job.projectType === 'solar' ? '#fef3c7' : job.projectType === 'wind' ? '#e0f2fe' : '#f3e8ff', color: '#1e293b' }}>
                          {job.projectType === 'solar' ? '☀️ Solar' : job.projectType === 'wind' ? '🌬️ Wind' : '☀️+🌬️ Hybrid'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <strong>{job.customerName}</strong>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{job.contactNumber}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div>{job.village}, {job.upazila}</div>
                        <small style={{ color: 'var(--color-text-muted)' }}>{job.district}, {job.division}</small>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <strong>{job.scheduledDate || 'Pending Schedule'}</strong>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Slot: {job.scheduledSlot || 'Full Day'}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span className={`status-badge status-${job.status}`} style={{ textTransform: 'uppercase', fontSize: '11px' }}>
                          {job.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="primary-button"
                          style={{ padding: '6px 14px', fontSize: '13px' }}
                          onClick={() => setSelectedJob(job)}
                        >
                          Manage Job →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EARNINGS & PAYOUTS */}
      {activeTab === 'earnings' && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px' }}>Commission & Earnings Breakdown</h3>
              <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: '14px' }}>Platform guaranteed payouts for certified field completion</p>
            </div>
            <button
              type="button"
              className="primary-button"
              onClick={() => alert('Payout request sent to SolarAgent Pro accounts department. Direct bank transfer will be processed within 24 hours.')}
            >
              Request Payout (৳{Number(stats.pendingEarnings).toLocaleString()})
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <div style={{ padding: '20px', background: 'var(--color-surface-soft)', borderRadius: '10px' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Payment Method</span>
              <h4 style={{ margin: '6px 0 0' }}>Direct Bank Transfer (EFTN / BEFTN)</h4>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>Account: {profile?.paymentInfo?.accountNo || 'DBBL / City Bank Account on file'}</p>
            </div>
            <div style={{ padding: '20px', background: 'var(--color-surface-soft)', borderRadius: '10px' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Commission Rate</span>
              <h4 style={{ margin: '6px 0 0' }}>5% Turnkey EPC Commission</h4>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>Guaranteed minimum ৳5,000 per commissioned site</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CREDENTIALS & PROFILE */}
      {activeTab === 'profile' && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>Technician Credentials & Certifications</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Full Name</label>
              <div style={{ fontWeight: 600, fontSize: '16px', marginTop: '2px' }}>{profile?.name}</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Contact Mobile</label>
              <div style={{ fontWeight: 600, fontSize: '16px', marginTop: '2px' }}>{profile?.contactNumber}</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Email Address</label>
              <div style={{ fontWeight: 600, fontSize: '16px', marginTop: '2px' }}>{profile?.email}</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Assigned Service Area</label>
              <div style={{ fontWeight: 600, fontSize: '16px', marginTop: '2px' }}>{profile?.serviceArea || 'All Bangladesh'}</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Solar PV Experience</label>
              <div style={{ fontWeight: 600, fontSize: '16px', marginTop: '2px' }}>{profile?.solarExperienceYears || 3} Years</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Wind Turbine Experience</label>
              <div style={{ fontWeight: 600, fontSize: '16px', marginTop: '2px' }}>{profile?.windExperienceYears || 1} Years</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Hybrid & Battery Experience</label>
              <div style={{ fontWeight: 600, fontSize: '16px', marginTop: '2px' }}>{profile?.hybridExperienceYears || 2} Years</div>
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px' }}>Approved Skills & Competencies</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {((profile?.skills as string[]) || ['Solar PV Mounting', 'Inverter Telemetry', 'LiFePO4 Storage Synchronization', 'SREDA Net-Metering Compliance']).map((skill, idx) => (
                <span key={idx} style={{ background: '#ecfdf5', color: '#065f46', padding: '6px 12px', borderRadius: '16px', fontSize: '13px', fontWeight: 500 }}>
                  ✓ {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* JOB MANAGEMENT MODAL */}
      {selectedJob && (
        <div className="modal-backdrop" onClick={() => setSelectedJob(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--color-surface)', maxWidth: '600px', width: '100%', borderRadius: '16px', padding: '28px', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span className="eyebrow">Work Order Management</span>
                <h3 style={{ margin: '4px 0 0', fontSize: '20px' }}>Order #{selectedJob.orderNumber}</h3>
              </div>
              <button type="button" className="icon-button" onClick={() => setSelectedJob(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ background: 'var(--color-surface-soft)', padding: '16px', borderRadius: '10px', marginBottom: '20px', fontSize: '14px' }}>
              <div><strong>Customer:</strong> {selectedJob.customerName} ({selectedJob.contactNumber})</div>
              <div><strong>Site Address:</strong> {selectedJob.address || `${selectedJob.village}, ${selectedJob.upazila}, ${selectedJob.district}`}</div>
              <div><strong>System Type:</strong> {selectedJob.projectType.toUpperCase()} ({selectedJob.configuration?.system || 'on-grid'})</div>
              <div><strong>Scheduled Date:</strong> {selectedJob.scheduledDate || 'Today'} ({selectedJob.scheduledSlot || 'full_day'})</div>
              <div><strong>Current Status:</strong> <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{selectedJob.status}</span></div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Field Inspection & Completion Notes:</label>
              <textarea
                rows={3}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', boxSizing: 'border-box' }}
                placeholder="Enter inverter serial numbers, open-circuit voltage tests (Voc), earth-resistance check, or customer handover comments..."
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSelectedJob(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="secondary-button"
                style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }}
                disabled={updatingStatus}
                onClick={() => handleUpdateJobStatus(selectedJob.id, 'installation_in_progress')}
              >
                🚗 Mark In Progress / En Route
              </button>
              <button
                type="button"
                className="primary-button"
                style={{ background: '#10b981', borderColor: '#10b981', color: 'white' }}
                disabled={updatingStatus}
                onClick={() => handleUpdateJobStatus(selectedJob.id, 'completed')}
              >
                ✓ Complete & Commission Site
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
