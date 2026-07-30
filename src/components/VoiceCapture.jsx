import { useRef, useState } from 'react'
import { Mic, Square } from 'lucide-react'

export default function VoiceCapture({ onText }) {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)
  const supported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window

  const start = () => {
    if (!supported) return alert('Voice typing is not supported in this browser. Use your phone keyboard microphone instead.')
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new Recognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.onresult = (event) => {
      let finalText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript
      }
      if (finalText) onText(finalText.trim())
    }
    recognition.onend = () => setListening(false)
    recognition.start()
    recognitionRef.current = recognition
    setListening(true)
  }

  const stop = () => {
    recognitionRef.current?.stop()
    setListening(false)
  }

  return <button type="button" className="secondary-button" onClick={listening ? stop : start}>
    {listening ? <><Square size={16}/> Stop listening</> : <><Mic size={16}/> Voice capture</>}
  </button>
}
