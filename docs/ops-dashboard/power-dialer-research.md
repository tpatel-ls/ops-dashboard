# Power Dialer Research

Date: 2026-07-06

## Product scope

The Power Dialer belongs under the LS Global Group org lane with Blue Text. The app should track it as a launch program, not a loose note.

Core jobs:

- Connect to the customer's existing RingCentral or NICE phone system.
- Import leads from CRM or upload.
- Score and sequence leads by answer and buying probability.
- Dial multiple numbers per rep and connect only live answers.
- Show rep assist context, script, notes, recording, and transcription.
- Follow up no-answers with compliant SMS, Apple Messages for Business where available, or callback tasks.
- Write every result, recording, transcript, and note back to CRM.
- Give managers a live dashboard for reach, talk time, conversion, rep performance, script performance, and overflow.

## Vendor findings

RingCentral is viable as an early connector because its developer surface includes voice, placing calls, call control, telephony session notifications, call logs, recordings, SMS, and analytics. This maps to click-to-call, live call monitoring, result ingestion, recordings, and reporting.

NICE CXone is viable for enterprise customers already using CXone. The developer surface includes authentication, admin resources, agent sessions, reporting, realtime data, and digital engagement. This maps to contact-center style agent workflows and manager reporting.

Apple blue messaging should use Apple Messages for Business or an approved messaging service provider. It is customer-initiated by design, can connect customers to agents through Messages on Apple devices, and requires brand registration/approval. The app should not depend on private automated iMessage or FaceTime hacks.

Reference links:

- RingCentral Voice API: https://developers.ringcentral.com/guide/voice
- NICE CXone API hub: https://developer.niceincontact.com/API
- NICE Digital Engagement API: https://developer.niceincontact.com/API/DigitalEngagementAPI
- Apple Messages for Business: https://www.apple.com/ios/business-chat/
- Apple Messages for Business setup example through Amazon Connect: https://docs.aws.amazon.com/connect/latest/adminguide/apple-messages-for-business.html

## Build plan in the app

Implemented surfaces:

- `Power Dialer` page for LSG launch command.
- Auto-upgrade setup that creates or enriches Blue Text and Power Dialer under LS Global Group.
- Scheduled tasks that appear in Week, Calendar, and Month.
- Capability map for phone connector, lead ordering, parallel dialing, rep assist, no-answer follow-up, CRM write-back, manager dashboard, and overflow agents.
- Guardrails for consent, opt-out, DNC, recording rules, Apple messaging path, and AI/human handoff.

Next implementation step after credentials:

1. Add a provider connector abstraction for RingCentral and NICE.
2. Add lead import schema and CSV uploader.
3. Add dial campaign simulation before live calls.
4. Add call event ingestion and normalized attempt records.
5. Add manager dashboard backed by real call/CRM events.
