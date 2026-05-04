\# Watchdog Spoke: Audio Architecture



\## The Hybrid Stack

\* \*\*Web Audio API (`KC.audio.ctx`):\*\* Used strictly for instant, synthesized sound effects (beeps, hazards, UI clicks). Zero latency.

\* \*\*HTML5 `<audio>` Elements:\*\* Used for background music (BGM) and Voiceover (VO).



\## Screen Reader Ducking Prevention

\* \*\*Rule:\*\* Do NOT use the Web Audio API for Voiceover. 

\* \*\*Why:\*\* Screen readers will "duck" (lower the volume of) standard HTML5 audio, allowing the TTS to be heard. They do not duck Web Audio API oscillators, which will drown out the screen reader.



\## Music Transitions

\* \*\*Rule:\*\* Use `KC.audio.switchToStyle(styleName)`. 

\* \*\*Execution:\*\* This function handles the crossfading. Never manually manipulate HTML5 audio volume or source paths directly inside mission files.

