// Renders one drum hit with Mutable Instruments Plaits' drum engines (Emilie Gillet, MIT license,
// github.com/pichenettes/eurorack), for drumlab.py. Built against a checkout of eurorack with
// stmlib in it (see drumlab.py: it builds this when it is needed).
//
// Usage: plaits_hit <engine> <note> <harmonics> <timbre> <morph> <accent> <seconds> > hit.f32
//   engine: kick, snare, hat, modal, particle (Plaits' bass drum, snare drum, hi-hat, modal
//   resonator and particle engines). note is a MIDI note; the others 0 to 1, as Plaits' knobs.
// Writes 48 kHz float32 pairs: the engine's main output, then its aux output (for the drums,
// the analog model and the synthetic one; for the hat, its two models).
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

using namespace plaits;

int main(int argc, char** argv) {
  if (argc < 8) { fprintf(stderr, "usage: plaits_hit engine note harmonics timbre morph accent seconds\n"); return 1; }
  static char ram[65536];
  stmlib::BufferAllocator allocator(ram, sizeof(ram));
  BassDrumEngine kick; SnareDrumEngine snare; HiHatEngine hat; ModalEngine modal; ParticleEngine particle;
  Engine* e = !strcmp(argv[1], "kick") ? (Engine*)&kick : !strcmp(argv[1], "snare") ? (Engine*)&snare
      : !strcmp(argv[1], "hat") ? (Engine*)&hat : !strcmp(argv[1], "modal") ? (Engine*)&modal : (Engine*)&particle;
  e->Init(&allocator); e->Reset();
  EngineParameters p;
  p.note = atof(argv[2]); p.harmonics = atof(argv[3]); p.timbre = atof(argv[4]); p.morph = atof(argv[5]); p.accent = atof(argv[6]);
  const size_t n = (size_t)(atof(argv[7]) * kSampleRate);
  float out[kMaxBlockSize], aux[kMaxBlockSize];
  std::vector<float> pairs;
  bool enveloped;
  for (size_t done = 0; done < n; done += kBlockSize) {
    p.trigger = done == 0 ? TRIGGER_RISING_EDGE : TRIGGER_LOW;
    e->Render(p, out, aux, kBlockSize, &enveloped);
    for (size_t i = 0; i < kBlockSize; ++i) { pairs.push_back(out[i]); pairs.push_back(aux[i]); }
  }
  fwrite(pairs.data(), sizeof(float), pairs.size(), stdout);
  return 0;
}
