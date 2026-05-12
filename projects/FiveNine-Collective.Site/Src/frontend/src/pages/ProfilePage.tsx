import { useAuth0 } from '@auth0/auth0-react'
import type { Account } from '../hooks/useAccount'

interface ProfilePageProps {
  account: Account
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatMemberSince(isoStr: string) {
  return new Date(isoStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
  })
}

export function ProfilePage({ account }: ProfilePageProps) {
  const { logout } = useAuth0()
  const initials = `${account.firstName[0]}${account.lastName[0]}`.toUpperCase()

  return (
    <main className="main-content">
      <section style={{ width: '100%', maxWidth: '480px' }}>
        <div className="card profile-card">
          <div className="profile-avatar-large" aria-hidden="true">
            {initials}
          </div>

          <div className="profile-name">
            <h1 className="profile-heading">
              {account.firstName} {account.lastName}
            </h1>
            <p className="profile-since">
              Member since {formatMemberSince(account.createdAt)}
            </p>
          </div>

          {(account.bio || account.dateOfBirth) && (
            <div className="profile-details">
              {account.bio && (
                <p className="profile-bio">{account.bio}</p>
              )}
              {account.dateOfBirth && (
                <div className="profile-field">
                  <span className="profile-field-label">Date of birth</span>
                  <span className="profile-field-value">{formatDate(account.dateOfBirth)}</span>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            className="signout-btn"
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
          >
            Sign Out
          </button>
        </div>
      </section>
    </main>
  )
}
