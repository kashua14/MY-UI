import { useEffect, useMemo, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'kpi_portal_investor_applications'

const ADMIN_CREDENTIALS = {
  email: 'admin@kpi-portal.com',
  password: 'Admin@123',
}

const defaultFirmDetails = {
  firmName: '',
  registrationNumber: '',
  firmType: 'Private Equity',
  investmentBudget: '',
  headquarters: '',
}

const defaultContactDetails = {
  contactName: '',
  jobTitle: '',
  contactEmail: '',
  contactPhone: '',
  preferredContactMethod: 'Email',
  notes: '',
}

function loadApplications() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return []

    const parsed = JSON.parse(saved)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function createApplicationId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return `app-${Date.now()}`
}

function toUserFriendlyDate(value) {
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function validateEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email)
}

function App() {
  const [applications, setApplications] = useState(() => loadApplications())
  const [authMode, setAuthMode] = useState('investor')
  const [currentUser, setCurrentUser] = useState(null)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginError, setLoginError] = useState('')

  const [formStep, setFormStep] = useState(1)
  const [formMessage, setFormMessage] = useState('')
  const [firmDetails, setFirmDetails] = useState(defaultFirmDetails)
  const [contactDetails, setContactDetails] = useState(defaultContactDetails)
  const [investorTab, setInvestorTab] = useState('new')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications))
  }, [applications])

  const sortedApplications = useMemo(() => {
    return [...applications].sort((a, b) => {
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    })
  }, [applications])

  const myApplications = useMemo(() => {
    if (!currentUser) return []
    return sortedApplications.filter((application) => application.submittedBy === currentUser.email)
  }, [currentUser, sortedApplications])

  const adminMetrics = useMemo(() => {
    const pending = applications.filter((application) => application.status === 'PENDING').length
    const approved = applications.filter((application) => application.status === 'APPROVED').length
    const rejected = applications.filter((application) => application.status === 'REJECTED').length

    return { pending, approved, rejected }
  }, [applications])

  const resetForm = () => {
    setFormStep(1)
    setFirmDetails(defaultFirmDetails)
    setContactDetails(defaultContactDetails)
  }

  const handleLogin = (event) => {
    event.preventDefault()
    setLoginError('')

    const email = loginForm.email.trim().toLowerCase()
    const password = loginForm.password.trim()

    if (!validateEmail(email)) {
      setLoginError('Please enter a valid email address.')
      return
    }

    if (!password) {
      setLoginError('Password is required.')
      return
    }

    if (authMode === 'admin') {
      if (email !== ADMIN_CREDENTIALS.email || password !== ADMIN_CREDENTIALS.password) {
        setLoginError('Invalid admin credentials.')
        return
      }

      setCurrentUser({
        role: 'admin',
        email: ADMIN_CREDENTIALS.email,
        displayName: 'Administrator',
      })
      setLoginForm({ email: '', password: '' })
      return
    }

    const nameFromEmail = email.split('@')[0]
    const displayName = nameFromEmail
      .split(/[._-]/)
      .filter(Boolean)
      .map((segment) => segment[0].toUpperCase() + segment.slice(1))
      .join(' ')

    setCurrentUser({
      role: 'investor',
      email,
      displayName: displayName || 'Investor',
    })
    setLoginForm({ email: '', password: '' })
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setAuthMode('investor')
    setLoginError('')
    setFormMessage('')
    resetForm()
    setInvestorTab('new')
  }

  const handleFirmDetailsNext = () => {
    if (!firmDetails.firmName.trim()) {
      setFormMessage('Firm name is required.')
      return
    }

    if (!firmDetails.registrationNumber.trim()) {
      setFormMessage('Registration number is required.')
      return
    }

    if (!firmDetails.investmentBudget.trim()) {
      setFormMessage('Estimated investment budget is required.')
      return
    }

    if (!firmDetails.headquarters.trim()) {
      setFormMessage('Headquarters location is required.')
      return
    }

    setFormMessage('')
    setFormStep(2)
  }

  const submitApplication = (event) => {
    event.preventDefault()

    if (!contactDetails.contactName.trim()) {
      setFormMessage('Contact person name is required.')
      return
    }

    if (!contactDetails.jobTitle.trim()) {
      setFormMessage('Contact person job title is required.')
      return
    }

    if (!validateEmail(contactDetails.contactEmail)) {
      setFormMessage('Please provide a valid contact email.')
      return
    }

    if (!contactDetails.contactPhone.trim()) {
      setFormMessage('Contact person phone number is required.')
      return
    }

    const newApplication = {
      id: createApplicationId(),
      status: 'PENDING',
      submittedBy: currentUser.email,
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
      firmDetails: {
        ...firmDetails,
        firmName: firmDetails.firmName.trim(),
        registrationNumber: firmDetails.registrationNumber.trim(),
        investmentBudget: firmDetails.investmentBudget.trim(),
        headquarters: firmDetails.headquarters.trim(),
      },
      contactDetails: {
        ...contactDetails,
        contactName: contactDetails.contactName.trim(),
        jobTitle: contactDetails.jobTitle.trim(),
        contactEmail: contactDetails.contactEmail.trim().toLowerCase(),
        contactPhone: contactDetails.contactPhone.trim(),
        notes: contactDetails.notes.trim(),
      },
    }

    setApplications((previous) => [newApplication, ...previous])
    resetForm()
    setInvestorTab('applications')
    setFormMessage('Application sent. You can track status in My Applications.')
  }

  const updateApplicationStatus = (applicationId, status) => {
    setApplications((previous) => {
      return previous.map((application) => {
        if (application.id !== applicationId) {
          return application
        }

        return {
          ...application,
          status,
          reviewedBy: currentUser.email,
          reviewedAt: new Date().toISOString(),
        }
      })
    })
  }

  if (!currentUser) {
    return (
      <div className="app-shell">
        <section className="auth-card fade-up">
          <div className="brand-row">
            <p className="brand-kicker">KPI Investor Portal</p>
            <h1>Application Intake System</h1>
            <p className="brand-copy">
              Investors submit firm and contact details in a two-step form. Admins review and approve or reject
              applications.
            </p>
          </div>

          <div className="mode-switch" role="tablist" aria-label="Sign in mode">
            <button
              type="button"
              className={authMode === 'investor' ? 'mode-tab active' : 'mode-tab'}
              onClick={() => {
                setAuthMode('investor')
                setLoginError('')
              }}
            >
              Investor Login
            </button>
            <button
              type="button"
              className={authMode === 'admin' ? 'mode-tab active' : 'mode-tab'}
              onClick={() => {
                setAuthMode('admin')
                setLoginError('')
              }}
            >
              Admin Login
            </button>
          </div>

          <form className="auth-form" onSubmit={handleLogin}>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={loginForm.email}
                onChange={(event) => setLoginForm((previous) => ({ ...previous, email: event.target.value }))}
                placeholder={authMode === 'admin' ? 'admin@kpi-portal.com' : 'you@firm.com'}
                required
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) => setLoginForm((previous) => ({ ...previous, password: event.target.value }))}
                placeholder="Enter password"
                required
              />
            </label>

            {authMode === 'admin' ? (
              <p className="helper">Demo admin credentials: `admin@kpi-portal.com` / `Admin@123`</p>
            ) : (
              <p className="helper">For demo purposes, any valid investor email/password can sign in.</p>
            )}

            {loginError ? <p className="error-banner">{loginError}</p> : null}

            <button className="primary-btn" type="submit">
              Sign In
            </button>
          </form>
        </section>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <main className="dashboard fade-up">
        <header className="topbar">
          <div>
            <p className="brand-kicker">KPI Investor Portal</p>
            <h2>{currentUser.role === 'admin' ? 'Admin Review Desk' : 'Investor Workspace'}</h2>
            <p className="topbar-subtitle">
              Signed in as {currentUser.displayName} ({currentUser.email})
            </p>
          </div>
          <button type="button" className="ghost-btn" onClick={handleLogout}>
            Logout
          </button>
        </header>

        {currentUser.role === 'investor' ? (
          <section className="panel">
            <div className="toolbar-row">
              <button
                type="button"
                className={investorTab === 'new' ? 'chip active' : 'chip'}
                onClick={() => setInvestorTab('new')}
              >
                New Application
              </button>
              <button
                type="button"
                className={investorTab === 'applications' ? 'chip active' : 'chip'}
                onClick={() => setInvestorTab('applications')}
              >
                My Applications ({myApplications.length})
              </button>
            </div>

            {investorTab === 'new' ? (
              <>
                <div className="stepper" aria-label="Application progress">
                  <div className={formStep === 1 ? 'step active' : 'step complete'}>1. Firm Details</div>
                  <div className={formStep === 2 ? 'step active' : 'step'}>2. Contact Person Details</div>
                </div>

                <form className="application-form" onSubmit={submitApplication}>
                  {formStep === 1 ? (
                    <div className="field-grid">
                      <label className="field">
                        <span>Investor Firm Name</span>
                        <input
                          type="text"
                          value={firmDetails.firmName}
                          onChange={(event) =>
                            setFirmDetails((previous) => ({ ...previous, firmName: event.target.value }))
                          }
                          required
                        />
                      </label>

                      <label className="field">
                        <span>Firm Registration Number</span>
                        <input
                          type="text"
                          value={firmDetails.registrationNumber}
                          onChange={(event) =>
                            setFirmDetails((previous) => ({ ...previous, registrationNumber: event.target.value }))
                          }
                          required
                        />
                      </label>

                      <label className="field">
                        <span>Firm Type</span>
                        <select
                          value={firmDetails.firmType}
                          onChange={(event) => setFirmDetails((previous) => ({ ...previous, firmType: event.target.value }))}
                        >
                          <option>Private Equity</option>
                          <option>Venture Capital</option>
                          <option>Family Office</option>
                          <option>Asset Manager</option>
                        </select>
                      </label>

                      <label className="field">
                        <span>Estimated Investment Budget (USD)</span>
                        <input
                          type="text"
                          value={firmDetails.investmentBudget}
                          onChange={(event) =>
                            setFirmDetails((previous) => ({ ...previous, investmentBudget: event.target.value }))
                          }
                          placeholder="e.g. 15000000"
                          required
                        />
                      </label>

                      <label className="field full-width">
                        <span>Firm Headquarters</span>
                        <input
                          type="text"
                          value={firmDetails.headquarters}
                          onChange={(event) =>
                            setFirmDetails((previous) => ({ ...previous, headquarters: event.target.value }))
                          }
                          placeholder="City, Country"
                          required
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="field-grid">
                      <label className="field">
                        <span>Contact Person Name</span>
                        <input
                          type="text"
                          value={contactDetails.contactName}
                          onChange={(event) =>
                            setContactDetails((previous) => ({ ...previous, contactName: event.target.value }))
                          }
                          required
                        />
                      </label>

                      <label className="field">
                        <span>Job Title</span>
                        <input
                          type="text"
                          value={contactDetails.jobTitle}
                          onChange={(event) =>
                            setContactDetails((previous) => ({ ...previous, jobTitle: event.target.value }))
                          }
                          required
                        />
                      </label>

                      <label className="field">
                        <span>Contact Email</span>
                        <input
                          type="email"
                          value={contactDetails.contactEmail}
                          onChange={(event) =>
                            setContactDetails((previous) => ({ ...previous, contactEmail: event.target.value }))
                          }
                          required
                        />
                      </label>

                      <label className="field">
                        <span>Contact Phone</span>
                        <input
                          type="tel"
                          value={contactDetails.contactPhone}
                          onChange={(event) =>
                            setContactDetails((previous) => ({ ...previous, contactPhone: event.target.value }))
                          }
                          required
                        />
                      </label>

                      <label className="field">
                        <span>Preferred Contact Method</span>
                        <select
                          value={contactDetails.preferredContactMethod}
                          onChange={(event) =>
                            setContactDetails((previous) => ({
                              ...previous,
                              preferredContactMethod: event.target.value,
                            }))
                          }
                        >
                          <option>Email</option>
                          <option>Phone</option>
                          <option>Either</option>
                        </select>
                      </label>

                      <label className="field full-width">
                        <span>Additional Notes</span>
                        <textarea
                          rows="4"
                          value={contactDetails.notes}
                          onChange={(event) => setContactDetails((previous) => ({ ...previous, notes: event.target.value }))}
                          placeholder="Anything the admin should know before review"
                        />
                      </label>
                    </div>
                  )}

                  {formMessage ? <p className="status-banner">{formMessage}</p> : null}

                  <div className="actions">
                    {formStep === 2 ? (
                      <button type="button" className="ghost-btn" onClick={() => setFormStep(1)}>
                        Back
                      </button>
                    ) : null}

                    {formStep === 1 ? (
                      <button type="button" className="primary-btn" onClick={handleFirmDetailsNext}>
                        Continue to Contact Details
                      </button>
                    ) : (
                      <button type="submit" className="primary-btn">
                        Submit Application
                      </button>
                    )}
                  </div>
                </form>
              </>
            ) : (
              <div className="application-list">
                {myApplications.length === 0 ? (
                  <p className="empty-state">No applications submitted yet.</p>
                ) : (
                  myApplications.map((application) => (
                    <article className="application-card" key={application.id}>
                      <div className="application-head">
                        <h3>{application.firmDetails.firmName}</h3>
                        <span className={`status-pill ${application.status.toLowerCase()}`}>{application.status}</span>
                      </div>

                      <p>
                        Registration No: {application.firmDetails.registrationNumber} | Type:{' '}
                        {application.firmDetails.firmType}
                      </p>
                      <p>Budget: {application.firmDetails.investmentBudget} USD</p>
                      <p>
                        Contact: {application.contactDetails.contactName} ({application.contactDetails.jobTitle})
                      </p>
                      <p>Submitted: {toUserFriendlyDate(application.submittedAt)}</p>
                      {application.reviewedAt ? (
                        <p>
                          Reviewed: {toUserFriendlyDate(application.reviewedAt)} by {application.reviewedBy}
                        </p>
                      ) : null}
                    </article>
                  ))
                )}
              </div>
            )}
          </section>
        ) : (
          <section className="panel">
            <div className="metrics-grid">
              <div className="metric-box">
                <p>Pending</p>
                <strong>{adminMetrics.pending}</strong>
              </div>
              <div className="metric-box">
                <p>Approved</p>
                <strong>{adminMetrics.approved}</strong>
              </div>
              <div className="metric-box">
                <p>Rejected</p>
                <strong>{adminMetrics.rejected}</strong>
              </div>
            </div>

            <div className="application-list">
              {sortedApplications.length === 0 ? (
                <p className="empty-state">No investor applications yet.</p>
              ) : (
                sortedApplications.map((application) => (
                  <article className="application-card" key={application.id}>
                    <div className="application-head">
                      <h3>{application.firmDetails.firmName}</h3>
                      <span className={`status-pill ${application.status.toLowerCase()}`}>{application.status}</span>
                    </div>

                    <p>Submitted by: {application.submittedBy}</p>
                    <p>Registration: {application.firmDetails.registrationNumber}</p>
                    <p>Type: {application.firmDetails.firmType}</p>
                    <p>Budget: {application.firmDetails.investmentBudget} USD</p>
                    <p>
                      Contact: {application.contactDetails.contactName} ({application.contactDetails.contactEmail},{' '}
                      {application.contactDetails.contactPhone})
                    </p>
                    <p>Submitted: {toUserFriendlyDate(application.submittedAt)}</p>
                    {application.contactDetails.notes ? <p>Notes: {application.contactDetails.notes}</p> : null}

                    <div className="actions">
                      <button
                        type="button"
                        className="approve-btn"
                        onClick={() => updateApplicationStatus(application.id, 'APPROVED')}
                        disabled={application.status !== 'PENDING'}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="reject-btn"
                        onClick={() => updateApplicationStatus(application.id, 'REJECTED')}
                        disabled={application.status !== 'PENDING'}
                      >
                        Reject
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
