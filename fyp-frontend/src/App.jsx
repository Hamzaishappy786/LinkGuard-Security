// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import NavBar from './components/NavBar.jsx'
import Home from './pages/Home.jsx'
import Result from './pages/Result.jsx'
import MultipleResults from './pages/MultipleResults.jsx'
import History from './pages/History.jsx'
import Dashboard from './pages/Dashboard.jsx'
import HowItWorks from './pages/HowItWorks.jsx'
import Features from './pages/Features.jsx'
import About from './pages/About.jsx'
import FAQ from './pages/FAQ.jsx'
import Privacy from './pages/Privacy.jsx'
import Terms from './pages/Terms.jsx'
import Contact from './pages/Contact.jsx'
import Login from './components/Auth/Login.jsx'
import Register from './components/Auth/Register.jsx'
import Footer from './components/Footer.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

export default function App(){
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-purple-900/20">
        <NavBar />
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/result" element={<Result />} />
            <Route path="/multiple-results" element={<MultipleResults />} />
            <Route path="/history" element={<History />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/features" element={<Features />} />
            <Route path="/about" element={<About />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  )
}