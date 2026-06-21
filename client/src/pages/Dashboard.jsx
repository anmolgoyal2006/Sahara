import { useAuth } from '../context/AuthContext';
import { useAppointments } from '../hooks/useAppointments';
import { useNotifications } from '../hooks/useNotifications';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { appointments, loading: apptLoading } = useAppointments();
  const { notifications, unreadCount, markRead } = useNotifications();

  const fullName = user?.user_metadata?.full_name || user?.email;
  const role = user?.user_metadata?.role || 'patient';

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // navigate handled by auth state change
    }
  };

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <h1>Welcome back, {fullName}</h1>
        <div className="header-actions">
          <span className="role-badge">{role}</span>
          <button onClick={handleSignOut} className="btn-secondary">
            Sign out
          </button>
        </div>
      </header>

      <div className="dashboard-grid">
        {/* Appointments */}
        <section className="dashboard-card">
          <h2>Upcoming appointments</h2>
          {apptLoading ? (
            <p>Loading…</p>
          ) : appointments.length === 0 ? (
            <p className="empty-state">No upcoming appointments.</p>
          ) : (
            <ul className="appointment-list">
              {appointments.slice(0, 5).map((appt) => (
                <li key={appt.id}>
                  <span className={`status-badge status-${appt.status}`}>
                    {appt.status}
                  </span>
                  <span>
                    {new Date(appt.scheduled_at).toLocaleString()}
                  </span>
                  {appt.notes && <small>{appt.notes}</small>}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Notifications */}
        <section className="dashboard-card">
          <h2>
            Notifications
            {unreadCount > 0 && (
              <span className="badge">{unreadCount}</span>
            )}
          </h2>
          {notifications.length === 0 ? (
            <p className="empty-state">No notifications.</p>
          ) : (
            <ul className="notification-list">
              {notifications.slice(0, 5).map((n) => (
                <li key={n.id} className={n.is_read ? 'read' : 'unread'}>
                  <strong>{n.title}</strong>
                  <p>{n.message}</p>
                  {!n.is_read && (
                    <button
                      onClick={() => markRead(n.id)}
                      className="btn-link"
                      aria-label="Mark as read"
                    >
                      Mark read
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
