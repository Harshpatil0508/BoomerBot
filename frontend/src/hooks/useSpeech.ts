import { useState, useEffect, useCallback, useRef } from 'react';

const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export function useSpeech(onResult: (text: string, isFinal: boolean) => void) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  // Reflects whether the user wants the mic on, so it can auto-resume after the bot finishes speaking.
  const wantsToListenRef = useRef(false);
  // Number of TTS utterances still queued/playing; the mic stays muted until this hits zero.
  const pendingSpeechRef = useRef(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
      if (SpeechRecognitionAPI) {
        recognitionRef.current = new SpeechRecognitionAPI();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          
          if (finalTranscript) {
            onResult(finalTranscript, true);
          } else if (interimTranscript) {
            onResult(interimTranscript, false);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          if (event.error !== 'no-speech') {
            setError(event.error);
          }
          setIsListening(false);
        };
        
        recognitionRef.current.onend = () => {
          setIsListening(false);
          // Browser may auto-stop on silence; resume if the user still wants to listen and the bot isn't speaking.
          if (wantsToListenRef.current && pendingSpeechRef.current === 0) {
            try {
              recognitionRef.current.start();
              setIsListening(true);
            } catch {
              // start() throws if it is already starting; safe to ignore
            }
          }
        };
      } else {
        setError("Speech recognition not supported in this browser. Fallback text input enabled.");
      }
    }
  }, [onResult]);

  const startListening = useCallback(() => {
    setError(null);
    wantsToListenRef.current = true;
    // Never open the mic while BoomerBot is speaking; it resumes automatically once speech ends.
    if (pendingSpeechRef.current > 0) return;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Could not start listening", e);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    wantsToListenRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error(e);
      }
      setIsListening(false);
    }
  }, []);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!synthRef.current) return;

    // Half-duplex turn-taking: pause the mic so it never records BoomerBot's own voice.
    pendingSpeechRef.current += 1;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore if it was not running
      }
    }

    const utterance = new SpeechSynthesisUtterance(text);

    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google'))) || voices[0];
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    const finish = () => {
      pendingSpeechRef.current = Math.max(0, pendingSpeechRef.current - 1);
      // Resume the mic only after the entire spoken queue drains, and only if recording is still on.
      if (pendingSpeechRef.current === 0) {
        setIsSpeaking(false);
        if (wantsToListenRef.current && recognitionRef.current) {
          try {
            recognitionRef.current.start();
            setIsListening(true);
          } catch {
            // ignore if already started
          }
        }
      }
      if (onEnd) onEnd();
    };

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = finish;
    utterance.onerror = (e) => {
      console.error("Speech synthesis error", e);
      finish();
    };

    synthRef.current.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    pendingSpeechRef.current = 0;
    setIsSpeaking(false);
    // cancel() does not reliably fire onend, so resume the mic here if the user still wants it.
    if (wantsToListenRef.current && recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        // ignore
      }
    }
  }, []);

  const cancelSpeech = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    pendingSpeechRef.current = 0;
    setIsSpeaking(false);
    if (wantsToListenRef.current && recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        // ignore
      }
    }
  }, []);

  return {
    isListening,
    isSpeaking,
    error,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    cancelSpeech
  };
}
