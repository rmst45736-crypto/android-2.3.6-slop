MINIMAL LAUNCHER 3.0 FINAL
==========================
Built for the SHW-M110S (Galaxy S, Android 2.3, rooted). Project: Android Studio, minSdk 8.

NOT COMPILED OR RUN where it was written (no Android SDK there). A static check found no missing imports and
balanced braces, but the first real build may still show an error. If it does, send the first red line.

SET UP (one time)
 1. Install. The launcher asks for nothing at runtime on 2.3; overlay/bluetooth/settings permissions are granted at install.
 2. Notification text on the bar: Edit home > "Light bar notifications: enable access..." then turn on
    "Minimal light bar" in Settings > Accessibility > Services.
 3. Screen-off (double-tap bar, panel "screen" tile, swipes): enable the device-admin the launcher already asks for.
 4. Root is used for double-tap-power = BACK and (as before) the Boot Studio style file jobs. Everything else works unrooted.

WHAT IT DOES
 LIGHT BAR (replaces the stock status bar in every app; "Light bar style" full / line only)
   - in LANDSCAPE (videos, games) it shrinks to a thin glowing light strip; portrait keeps the full bar everywhere.
     The strip has a 24dp-tall invisible touch zone at the top so you can still pull it down; messages pop out of it
     for a few seconds. Edit home > "Light bar in landscape" switches between strip and full bar.
   - idle (home): clock, notification chips, bluetooth, signal, wifi, battery %. Sweep of light when something arrives.
   - messages type out in the middle: notifications, buds connected, charger in/out, battery full, low battery, phone hot.
   - pull down: tiles (wifi, bt, sound, rotate, bar, gps, settings, screen off), brightness + volume, music controls,
     recent notifications (tap to open), battery details. Pull 1/3 and it opens itself; short pull springs back.
   - slide sideways along the bar = brightness (live "brightness NN%").
   - double-tap the bar = screen off.
   - buzz when the pull latches and on tile taps.
 CHARGING: full-screen liquid-wave animation on plug-in (wall charger = "fast charging" look, USB = calmer),
   bubbles, sparks, pulse rings, counting %, voltage/temperature. Battery icon on the bar has a flowing light while charging.
 BLUETOOTH ACCURACY: "buds connected" now only appears when an audio profile (A2DP/headset) really connects, so a PC or
   phone linking over Bluetooth is no longer called buds. Other devices are labelled pc / phone / bluetooth device
   (by the phone's device class, falling back to the name); anything it can't classify is announced as a generic
   "bluetooth device" after a 2.5s wait. Bluetooth notifications show as "bluetooth", not "opp" (small table of
   system app names; other apps use their own label).
 BLUETOOTH / EARBUDS: "bt" button in the player (buds animation, settings, on/off); animation on connect;
   this player keeps the earbud buttons (other players can't steal them).
 PLAYER: volume bar, bounce on buttons, cover pop-in. DRAWER: keyboard on open (retries), springy rise, rows glide in.
 LOCK: new mode "music player, stock lock OFF". Double-tap power = BACK (root; skipped in lock modes 2-4).
 Apps launch with a fade.

EDIT HOME MENU (all toggles)
   Light bar on/off | light bar in landscape (strip/full) | hide stock bar on home | notification access | bluetooth buds | bar style |
   drawer keyboard | keep earbud buttons | double-tap power back | charging animation | preview charging animation

LIMITS (honest list)
   - The stock status bar can't be removed from other apps by an app: on Android 2.3 it lives inside the system, and
     only a ROM change (or hiding it per app) removes it. The light bar covers it; in landscape strip mode it shows
     again underneath in non-fullscreen apps. The home screen can hide it ("hide stock status bar").
   - Orientation is detected from the display size on rotation (no polling).
   - No earbud battery %: Android 2.3 cannot read it. The % shown everywhere is the PHONE battery.
   - No Bluetooth "driver update": the stack lives in the ROM/kernel, not in an app.
   - Full-screen games/video: the bar still draws on top; use the panel's "bar" tile for "line only".
   - The notification list is a log of what arrived; Android 2.3 cannot read or remove the real list.
   - The pull-down panel is disabled while the phone is locked (so a locked phone can't be changed from it).
   - Brightness/rotation need WRITE_SETTINGS (granted at install on 2.3); if the ROM doesn't apply a brightness change
     until the next wake, that's the ROM.
   - Double-tap power -> BACK can take about a second (the 'input' command starts a whole process).

IF SOMETHING MISBEHAVES
   - Bar in the way of a screen: Edit home > Light bar style > line only (or turn the light bar off).
   - Phone feels slow with the panel open: it animates at ~30fps only while open; close it.
   - Double power acts like HOME: your lock mode is a terminal/music lock (2-4) - that is BACK closing the lock screen.
   See CHANGELOG_v6-v9.txt for details of each feature.
