import librosa
import numpy as np
import json
import sys, os

SR = 22050
HOP = 512
N_FFT = 1024

mp3_path = os.path.join(os.path.dirname(__file__), "..", "public", "song.mp3")
out_path = os.path.join(os.path.dirname(__file__), "..", "public", "audio-data.json")

print(f"Loading {mp3_path}...")
y, sr = librosa.load(mp3_path, sr=SR, mono=True)
duration = len(y) / sr
print(f"Duration: {duration:.1f}s, Sample rate: {sr}Hz")

# --- RMS energy envelope ---
rms = librosa.feature.rms(y=y, frame_length=N_FFT, hop_length=HOP)[0]
rms = np.clip(rms, 0, None)
# Normalize to 0-1
rms_max = rms.max()
if rms_max > 0:
    rms = rms / rms_max
rms = [round(float(v), 4) for v in rms]

# --- Onset detection ---
onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=HOP)
onset_env_norm = onset_env / (onset_env.max() + 1e-10)
onset_env_norm = [round(float(v), 4) for v in onset_env_norm]

onsets_frames = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr, hop_length=HOP)
onsets_times = librosa.frames_to_time(onsets_frames, sr=sr, hop_length=HOP).tolist()
onsets_times = [round(t, 3) for t in onsets_times]

# --- Beat detection ---
tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, hop_length=HOP)
beats_times = librosa.frames_to_time(beat_frames, sr=sr, hop_length=HOP).tolist()
beats_times = [round(t, 3) for t in beats_times]

# --- Band energies (4 bands matching our frequency ranges) ---
# With sr=22050, N_FFT=1024: each bin = 22050/1024 = 21.5 Hz
# Bin 0-6  = 0-129 Hz  (bass)
# Bin 6-20 = 129-430 Hz (low-mid)
# Bin 20-50 = 430-1075 Hz (high-mid)
# Bin 50-128 = 1075-22050 Hz (highs)
# But with N_FFT=1024, we only have 513 bins (0-512)
# Bin 0-6, 6-20, 20-50, 50-256 (rest)

D = librosa.stft(y, n_fft=N_FFT, hop_length=HOP)
mag = np.abs(D)
n_bins = mag.shape[0]

band_edges = [0, min(6, n_bins-1), min(20, n_bins-1), min(50, n_bins-1), n_bins-1]
band_energies = []
for i in range(len(band_edges)-1):
    lo, hi = band_edges[i], band_edges[i+1]
    band = mag[lo:hi, :]
    energy = np.sum(band**2, axis=0)
    energy = np.sqrt(energy)
    e_max = energy.max()
    if e_max > 0:
        energy = energy / e_max
    band_energies.append([round(float(v), 4) for v in energy])

# --- Spectral centroid (brightness) ---
centroid = librosa.feature.spectral_centroid(y=y, sr=sr, n_fft=N_FFT, hop_length=HOP)[0]
centroid_max = centroid.max()
if centroid_max > 0:
    centroid = centroid / centroid_max
centroid = [round(float(v), 4) for v in centroid]

data = {
    "sampleRate": sr,
    "hopLength": HOP,
    "duration": round(duration, 3),
    "tempo": round(float(tempo[0] if hasattr(tempo, '__iter__') else tempo), 1),
    "numFrames": len(rms),
    "rms": rms,
    "onsetStrength": onset_env_norm,
    "onsets": onsets_times,
    "beats": beats_times,
    "bandEnergies": band_energies,
    "spectralCentroid": centroid,
}

with open(out_path, "w") as f:
    json.dump(data, f, separators=(",", ":"))

print(f"Exported {out_path}")
print(f"  Frames: {len(rms)}, Beats: {len(beats_times)}, Onsets: {len(onsets_times)}")
t = float(tempo[0] if hasattr(tempo, '__iter__') else tempo)
print(f"  Tempo: {t:.1f} BPM")
print(f"  JSON size: {os.path.getsize(out_path) / 1024:.1f} KB")
