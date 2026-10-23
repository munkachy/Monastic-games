// Renders one note or hit with Mutable Instruments Plaits' engines (Emilie Gillet, MIT license,
// github.com/pichenettes/eurorack), for drumlab.py and plaitsinst.py. Built against a checkout of
// eurorack with stmlib in it (drumlab.py builds this when it is needed).
//
// Usage: plaits_hit <engine> <note> <harmonics> <timbre> <morph> <accent> <seconds>
//                   [vibrato semitones] [vibrato Hz] [timbre swing] [glide semitones] [glide seconds] > note.f32
//   engine: kick, snare, hat, modal, particle, string, va, vcf, waveshape, fm, grain, additive,
//   wavetable, chord, speech, swarm, noise, stringmachine, phasedist, terrain, chiptune (Plaits'
//   engines by their names on the module). note is a MIDI note; the others 0 to 1, as Plaits' knobs.
//   The extras move a held note: a vibrato (and the timbre swinging with it, slower), and a glide
//   from some semitones away into the note.
// The note is struck (triggered) at the start; the engines that need no trigger simply sound. Writes
// 48 kHz float32 pairs: the engine's main output, then its aux output.
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <vector>
#include "stmlib/utils/buffer_allocator.h"
#include "plaits/dsp/engine/bass_drum_engine.h"
#include "plaits/dsp/engine/snare_drum_engine.h"
#include "plaits/dsp/engine/hi_hat_engine.h"
#include "plaits/dsp/engine/modal_engine.h"
#include "plaits/dsp/engine/particle_engine.h"
#include "plaits/dsp/engine/string_engine.h"
#include "plaits/dsp/engine/virtual_analog_engine.h"
#include "plaits/dsp/engine/waveshaping_engine.h"
#include "plaits/dsp/engine/fm_engine.h"
#include "plaits/dsp/engine/grain_engine.h"
#include "plaits/dsp/engine/additive_engine.h"
#include "plaits/dsp/engine/wavetable_engine.h"
#include "plaits/dsp/engine/chord_engine.h"
#include "plaits/dsp/engine/speech_engine.h"
#include "plaits/dsp/engine/swarm_engine.h"
#include "plaits/dsp/engine/noise_engine.h"
#include "plaits/dsp/engine2/virtual_analog_vcf_engine.h"
#include "plaits/dsp/engine2/string_machine_engine.h"
#include "plaits/dsp/engine2/phase_distortion_engine.h"
#include "plaits/dsp/engine2/wave_terrain_engine.h"
#include "plaits/dsp/engine2/chiptune_engine.h"

using namespace plaits;

template <typename E> Engine* make() { static E e; return &e; }

int main(int argc, char** argv) {
  if (argc < 8) { fprintf(stderr, "usage: plaits_hit engine note harmonics timbre morph accent seconds [vib vibhz swing glide glidesecs]\n"); return 1; }
  static char ram[262144];
  stmlib::BufferAllocator allocator(ram, sizeof(ram));
  const char* n = argv[1];
  Engine* e = !strcmp(n, "kick") ? make<BassDrumEngine>() : !strcmp(n, "snare") ? make<SnareDrumEngine>()
      : !strcmp(n, "hat") ? make<HiHatEngine>() : !strcmp(n, "modal") ? make<ModalEngine>()
      : !strcmp(n, "particle") ? make<ParticleEngine>() : !strcmp(n, "string") ? make<StringEngine>()
      : !strcmp(n, "va") ? make<VirtualAnalogEngine>() : !strcmp(n, "vcf") ? make<VirtualAnalogVCFEngine>()
      : !strcmp(n, "waveshape") ? make<WaveshapingEngine>() : !strcmp(n, "fm") ? make<FMEngine>()
      : !strcmp(n, "grain") ? make<GrainEngine>() : !strcmp(n, "additive") ? make<AdditiveEngine>()
      : !strcmp(n, "wavetable") ? make<WavetableEngine>() : !strcmp(n, "chord") ? make<ChordEngine>()
      : !strcmp(n, "speech") ? make<SpeechEngine>() : !strcmp(n, "swarm") ? make<SwarmEngine>()
      : !strcmp(n, "noise") ? make<NoiseEngine>() : !strcmp(n, "stringmachine") ? make<StringMachineEngine>()
      : !strcmp(n, "phasedist") ? make<PhaseDistortionEngine>() : !strcmp(n, "terrain") ? make<WaveTerrainEngine>()
      : !strcmp(n, "chiptune") ? make<ChiptuneEngine>() : nullptr;
  if (!e) { fprintf(stderr, "no engine %s\n", n); return 1; }
  e->Init(&allocator); e->Reset();
  EngineParameters p;
  const float note = atof(argv[2]), timbre = atof(argv[4]);
  p.harmonics = atof(argv[3]); p.morph = atof(argv[5]); p.accent = atof(argv[6]);
  const size_t len = (size_t)(atof(argv[7]) * kSampleRate);
  const float vib = argc > 8 ? atof(argv[8]) : 0, vibhz = argc > 9 ? atof(argv[9]) : 5;
  const float swing = argc > 10 ? atof(argv[10]) : 0, glide = argc > 11 ? atof(argv[11]) : 0, glides = argc > 12 ? atof(argv[12]) : 0.1f;
  float out[kMaxBlockSize], aux[kMaxBlockSize];
  std::vector<float> pairs;
  bool enveloped;
  for (size_t done = 0; done < len; done += kBlockSize) {
    const float t = done / kSampleRate;
    const float in = 1.0f - expf(-t / 0.35f);           // the vibrato comes in over the first half second
    p.note = note + vib * in * sinf(6.2831853f * vibhz * t) + glide * expf(-t / glides);
    p.timbre = fminf(1.0f, fmaxf(0.0f, timbre + swing * sinf(6.2831853f * vibhz * 0.13f * t)));
    p.trigger = done == 0 ? TRIGGER_RISING_EDGE : TRIGGER_LOW;
    e->Render(p, out, aux, kBlockSize, &enveloped);
    for (size_t i = 0; i < kBlockSize; ++i) { pairs.push_back(out[i]); pairs.push_back(aux[i]); }
  }
  fwrite(pairs.data(), sizeof(float), pairs.size(), stdout);
  return 0;
}
