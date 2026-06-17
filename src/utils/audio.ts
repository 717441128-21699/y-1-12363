export class AudioManager {
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingStream: MediaStream | null = null;

  init(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  resume(): void {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  playTone(frequency: number, duration: number, type: OscillatorType = 'sine'): void {
    if (!this.audioContext) this.init();
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    const now = this.audioContext.currentTime;
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  playDrum(): void {
    if (!this.audioContext) this.init();
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(40, this.audioContext.currentTime + 0.1);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.1);
  }

  playBeat(): void {
    this.playDrum();
  }

  playSuccess(): void {
    if (!this.audioContext) this.init();
    if (!this.audioContext) return;

    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.2), i * 100);
    });
  }

  playFail(): void {
    if (!this.audioContext) this.init();
    if (!this.audioContext) return;

    const notes = [300, 250, 200];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.2, 'sawtooth'), i * 150);
    });
  }

  speak(text: string, rate: number = 1): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = rate;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  }

  async startRecording(): Promise<void> {
    try {
      this.recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.recordingStream);
      this.recordedChunks = [];

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.start();
    } catch (e) {
      console.error('Failed to start recording:', e);
    }
  }

  stopRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.recordedChunks, { type: 'audio/wav' });
        
        if (this.recordingStream) {
          this.recordingStream.getTracks().forEach(track => track.stop());
          this.recordingStream = null;
        }
        
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  playAudioBlob(blob: Blob): void {
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    audio.play();
  }

  getCurrentTime(): number {
    if (!this.audioContext) this.init();
    return this.audioContext?.currentTime || 0;
  }
}

export const audioManager = new AudioManager();
