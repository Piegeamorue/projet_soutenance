import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { formatDoctorName } from '../utils/formatDoctor'

export default function VerifyPrescription() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    verify()
  }, [token])

  const verify = async () => {
    try {
      const { data } = await axios.get(`http://localhost:5000/api/prescriptions/verify/${token}`)
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.message || "Cette ordonnance est introuvable, invalide ou a été modifiée.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col items-center justify-center p-4">
      {/* Brand logo */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-green-600 cursor-pointer animate-pulse" onClick={() => navigate('/')}>
          MediCam
        </h1>
        <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-semibold">
          Service d'authentification numérique
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl shadow-xl p-12 text-center max-w-md w-full border border-gray-100">
          <p className="text-gray-500 font-semibold">Analyse de la signature cryptographique...</p>
        </div>
      ) : error || !result?.valid ? (
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full border-t-8 border-red-500 border border-gray-100 text-center space-y-6">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner">
            ⚠️
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-red-600">Ordonnance non authentique</h2>
            <p className="text-sm text-gray-500 leading-relaxed font-light">
              {error || "Ce code de sécurité n'est lié à aucune ordonnance authentique émise par la plateforme MediCam."}
            </p>
          </div>
          <p className="text-xs text-red-400 font-medium bg-red-50 p-3 rounded-lg leading-relaxed">
            ATTENTION : Ne délivrez aucun médicament sur la base de ce document. Il peut s'agir d'une contrefaçon.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 rounded-xl transition-colors text-sm"
          >
            Retour à l'accueil
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-lg w-full border-t-8 border-green-500 border border-gray-100 space-y-6">
          <div className="flex items-center gap-4 justify-center sm:justify-start">
            <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center text-3xl shadow-inner flex-shrink-0">
              ✓
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-green-600">Ordonnance Authentique</h2>
              <p className="text-xs text-gray-400 uppercase font-semibold">Signature électronique certifiée</p>
            </div>
          </div>

          <div className="border-t border-b divide-y divide-gray-100 border-gray-100 py-2 text-sm text-gray-600">
            <div className="py-3 flex justify-between">
              <span className="font-semibold text-gray-400">Ordonnance N°</span>
              <span className="font-bold text-gray-800">{result.prescription.id}</span>
            </div>
            <div className="py-3 flex justify-between">
              <span className="font-semibold text-gray-400">Médecin Prescripteur</span>
              <span className="font-bold text-gray-800">{formatDoctorName(result.prescription.doctor_name)}</span>
            </div>
            <div className="py-3 flex justify-between">
              <span className="font-semibold text-gray-400">Patient Concerné</span>
              <span className="font-bold text-gray-800">{result.prescription.patient_name}</span>
            </div>
            <div className="py-3 flex justify-between">
              <span className="font-semibold text-gray-400">Date de prescription</span>
              <span className="font-bold text-gray-800">
                {new Date(result.prescription.created_at).toLocaleDateString('fr-FR')}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Médicaments certifiés</h3>
              <div className="mt-2 bg-green-50/50 border border-green-100 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-line font-medium leading-relaxed">
                {result.prescription.medications}
              </div>
            </div>

            {result.prescription.instructions && (
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Instructions de prise</h3>
                <div className="mt-2 bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600 whitespace-pre-line font-light leading-relaxed">
                  {result.prescription.instructions}
                </div>
              </div>
            )}
          </div>

          <p className="text-[11px] text-center text-gray-400 leading-relaxed font-light">
            Ce document a été signé de manière chiffrée lors de la téléconsultation. 
            Toute modification physique ou altération rend ce certificat nul et non avenu.
          </p>

          <button
            onClick={() => navigate('/')}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-all shadow-md text-sm"
          >
            Fermer le certificat
          </button>
        </div>
      )}
    </div>
  )
}
