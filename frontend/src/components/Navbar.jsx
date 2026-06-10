import { useState } from "react";
import { Link } from "react-router-dom";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-green-100">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <span className="text-xl font-bold text-green-700 tracking-tight">
            Medi<span className="text-green-500">Cam</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <a href="#fonctionnalites" className="hover:text-green-600 transition-colors">Fonctionnalités</a>
          <a href="#specialites" className="hover:text-green-600 transition-colors">Spécialités</a>
          <a href="#conseils" className="hover:text-green-600 transition-colors">Conseils santé</a>
          <Link to="/classement" className="hover:text-green-600 transition-colors">Classement</Link>
        </div>

        {/* Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="px-4 py-2 text-sm font-semibold text-green-600 border border-green-600 rounded-lg hover:bg-green-50 transition-colors">
            Connexion
          </Link>
          <Link to="/register" className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
            S'inscrire
          </Link>
        </div>

        {/* Mobile burger */}
        <button className="md:hidden text-gray-600 focus:outline-none" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-green-100 px-4 py-4 flex flex-col gap-4">
          <a href="#fonctionnalites" className="text-gray-600 font-medium hover:text-green-600" onClick={() => setMenuOpen(false)}>Fonctionnalités</a>
          <a href="#specialites" className="text-gray-600 font-medium hover:text-green-600" onClick={() => setMenuOpen(false)}>Spécialités</a>
          <a href="#conseils" className="text-gray-600 font-medium hover:text-green-600" onClick={() => setMenuOpen(false)}>Conseils santé</a>
          <Link to="/classement" className="text-gray-600 font-medium hover:text-green-600" onClick={() => setMenuOpen(false)}>Classement</Link>
          <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
            <Link to="/login" className="text-center py-2 font-semibold text-green-600 border border-green-600 rounded-lg hover:bg-green-50 transition-colors">
              Connexion
            </Link>
            <Link to="/register" className="text-center py-2 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
              S'inscrire
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
