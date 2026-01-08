# 🎙️ Voice-Note Upload Flow for Sensitive Listings

This flow activates when a listing is flagged by emotional scan.

## Step 1: Trigger

- Listing is paused due to urgent or emotional language
- `overrideRequired: true` is set in `listing-flagged.json`

## Step 2: Prompt User

- System sends message:  
  _"Your listing has been paused for emotional safety. Please submit a voice-note explaining your offer in your own words."_

## Step 3: Upload

- User sends voice-note via WhatsApp or web form
- File saved to: `audio/listings/LIST006_voice_note.mp3`
- Transcript saved to: `listing-voice-notes.json`

## Step 4: Council Review

- Council listens to voice-note
- Reviews emotional tone, clarity, and dignity
- Updates `override-dashboard.json` with decision

## Step 5: Activation

- If approved, listing is reframed and moved to `listing-public.json`
- Emotional triggers are removed or softened
- Listing status updated to `active`

This flow protects emotional sovereignty while honoring user intent.
