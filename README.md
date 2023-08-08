# WhisperJournal

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT) ![android](https://img.shields.io/badge/android-3DDC84?logo=android&logoColor=white) [![Android Build status](https://build.appcenter.ms/v0.1/apps/767e9717-9177-438e-b3e6-618d7d779ea4/branches/main/badge)](https://appcenter.ms) ![iOS](https://img.shields.io/badge/iOS-000000?logo=ios&logoColor=white) [![iOS Build status](https://build.appcenter.ms/v0.1/apps/fbefa9e2-b610-461a-9bc2-eed714444570/branches/main/badge)](https://appcenter.ms)

Privacy-first voice journal app built using [React Native](https://reactnative.dev) using [whisper.cpp](https://github.com/ggerganov/whisper.cpp/) through [whisper.rn](https://github.com/mybigday/whisper.rn/) for local transcription of voice recordings.

Features:

- Autodetect language, for multi-language support
- Translate non-English audio to an English transcript
- Integrated noise reduction using AFFTDN in FFMPEG
- Model selection
- Full privacy thanks to local inference; the only network calls are to download transcription models, not even analytics/telemetry
- Android and iOS
- Dark mode
- Open-source

# Dev environment setup

Tested on MacOS 13.4.1 running on Apple Silicon (M2 chip), using:

- Node 18.17.0
- Java 11 (openjdk 11.0.20 2023-07-18 LTS)
- XCode 13.4.1

## Step 0: Set up local env for cross-platform development

Follow the instructions under [React Native - Environment Setup](https://reactnative.dev/docs/environment-setup) for your platform under the "React Native CLI Quickstart" guide for both target OSes until the "Creating a new application" step.

## Step 1: Install all the things

Assuming you've already set up all the other things, `yarn` should ship as part of `node`; as a result, you can just run `yarn` and everything should install.

NOTE: You might have to run `corepack enable` to activate yarn, if you just installed `node`.

```bash
git clone git@github.com:kaizoco/WhisperJournal.git
cd WhisperJournal
yarn
```

## Step 2: Build app

```bash
yarn start

yarn android
# or for ios
yarn ios
```

# About Kaizo & Co.

We make cool things, check out our [website](https://kaizoco.com)!
