/**
 * VELARI SHOWROOM AMBIENT RETAIL LOUNGE MUSIC SYNTHESIZER
 * Web Audio API orqali hech qanday og'ir fayllarni yuklamasdan,
 * mayin, soatlab quloqqa yoqimli chalinadigan ambient lo-fi retail akkordlar.
 */

export class ShowroomAudio {
    private ctx: AudioContext | null = null;
    private isPlaying = false;
    private timerId: any = null;
    private masterGain: GainNode | null = null;

    // Akkordlar to'plami (Warm neo-soul / lo-fi jazz lounge: Fmaj7 -> Em7 -> Dm7 -> Cmaj7)
    private chords: number[][] = [
        [174.61, 220.00, 261.63, 329.63], // Fmaj7
        [164.81, 196.00, 246.94, 293.66], // Em7
        [146.83, 174.61, 220.00, 261.63], // Dm7
        [130.81, 164.81, 196.00, 246.94]  // Cmaj7
    ];
    private chordIndex = 0;

    public init() {
        if (this.ctx) return;
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.18, this.ctx.currentTime); // Juda yumshoq fon ovozi
        this.masterGain.connect(this.ctx.destination);
    }

    public play() {
        this.init();
        if (!this.ctx || !this.masterGain) return;

        if (this.ctx.state === "suspended") {
            this.ctx.resume();
        }

        if (this.isPlaying) return;
        this.isPlaying = true;
        this.chordIndex = 0;
        this.triggerNextChord();
    }

    private triggerNextChord() {
        if (!this.isPlaying || !this.ctx || !this.masterGain) return;

        const chordNotes = this.chords[this.chordIndex % this.chords.length];
        this.chordIndex++;

        const now = this.ctx.currentTime;
        const duration = 4.2; // Har bir akkord 4.2 soniya mayin yangraydi

        // Yumshoq analog filter (Low-pass 600Hz — chuqur, shinam qorong'i lo-fi tuyg'usi)
        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(550, now);

        const chordGain = this.ctx.createGain();
        chordGain.gain.setValueAtTime(0, now);
        chordGain.gain.linearRampToValueAtTime(0.12, now + 1.2); // Silliq ko'tarilish
        chordGain.gain.exponentialRampToValueAtTime(0.001, now + duration); // Silliq so'nish

        chordGain.connect(filter);
        filter.connect(this.masterGain);

        // Akkord notalarini generatsiya qilish
        chordNotes.forEach((freq, idx) => {
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            osc.type = idx % 2 === 0 ? "sine" : "triangle";
            osc.frequency.setValueAtTime(freq, now);

            // Nozik analog detune (chorus effect)
            osc.detune.setValueAtTime((Math.random() - 0.5) * 8, now);

            osc.connect(chordGain);
            osc.start(now);
            osc.stop(now + duration);
        });

        this.timerId = setTimeout(() => {
            this.triggerNextChord();
        }, (duration - 0.8) * 1000); // Akkordlar bir-birining ustiga silliq ulanadi
    }

    public stop() {
        this.isPlaying = false;
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
        if (this.ctx && this.masterGain) {
            this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
        }
    }

    public toggle(): boolean {
        if (this.isPlaying) {
            this.stop();
            return false;
        } else {
            this.play();
            return true;
        }
    }

    public dispose() {
        this.stop();
        if (this.ctx) {
            this.ctx.close();
            this.ctx = null;
        }
    }
}
