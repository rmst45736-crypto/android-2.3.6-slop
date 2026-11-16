minimal-launcher v6 : light bar + bluetooth buds + music lock (stock lock off) + volume bar

NOT COMPILED OR RUN (no Android SDK where this was written). If Android Studio shows a red error, send the first one.

1) LIGHT BAR (the "hacker dynamic island")
   - A 2dp glowing line at the top of the screen. It grows into a one-line terminal strip for a message
     (types it out, holds ~3s, shrinks back). Idle = no timers running, so no battery cost.
   - Shows: notifications ("whatsapp: sender text"), buds connected/disconnected, charger plugged/removed, low battery.
     Battery % is shown on the right of the strip.
   - Not touchable: it never blocks taps. It draws over the stock status bar (it does not remove it).
   - Home > Edit home > "Light bar: on/off", "Hide stock status bar on home" (home screen only).
   - Notifications need a one-time step: Edit home > "Light bar notifications: enable access..." then turn on
     "Minimal light bar" in Settings > Accessibility > Services. (Android 2.3 has no notification-listener API;
     the accessibility API is the only non-root way. Without it the bar still shows bluetooth/charger/battery.)

2) BLUETOOTH
   - Player: new "bt" button (top row). Dim = no buds, bright = audio going to bluetooth.
     Tap: animation + status, [settings] opens Android's Bluetooth settings, [turn on/off] toggles the radio.
   - When your buds connect while the player is open, the buds animation pops up for ~3.5s.
   - Also in Edit home > "Bluetooth buds...".
   - Works for any headset/earbuds, including the HOCO E34 Plus. Audio-class devices only.
   - What this CANNOT do: a "driver update". The Bluetooth stack/driver is part of the ROM/kernel and an app can't
     replace it, root or not. Audio quality/codec (SBC only on Android 2.3) and range depend on the ROM and chip.
     If connecting is flaky, the realistic fixes are: forget + re-pair the buds, keep the phone and buds close,
     and a ROM with a newer Bluetooth stack.

3) MUSIC LOCK SCREEN WITH STOCK LOCK OFF (the bug)
   - The old "music player" lock mode never turned the stock lock screen off - only the terminal mode did.
   - New 5th mode in Edit home > Lock screen: "music player, stock lock OFF". Same mechanism as the dino/terminal
     one (disableKeyguard while the service runs), shows the player with clock + close button on every screen-on.
   - It asks for confirmation first, because it disables any PIN/pattern while it's running.
   - The old "music player" mode (1) is unchanged and still sits above the stock lock.

4) VOLUME
   - Player: plain volume bar (music stream). Drag it, or use the volume keys - it follows both. Shows percent.

Files added: BarView, BarService, NotifAccessService, BtBudsView, BtHelper, BtReceiver, BtDialog, res/xml/notif_access.xml
Files changed: AndroidManifest.xml (bluetooth + overlay permissions, services/receiver), MainActivity, PlayerActivity,
               LockService, BootReceiver


==================== v7 additions ====================
(not compiled or run - no Android SDK here; send me the first red error if the build fails)

PULL-DOWN LIGHT BAR (replaces the stock status bar in every app)
 - "Light bar style: full" draws a status bar over the stock one: clock, notification chips, bluetooth, signal, wifi,
   battery with %. It sits above the stock bar so you pull THIS down, not the stock shade.
 - Pull it down (or flick) for the panel: clock/date, tiles (wifi, bt, sound, rotate, bar, gps, settings, screen off),
   brightness + volume sliders, music controls, recent notifications (tap one to open it). Back key or drag up closes it.
 - Not available on the lock screen (so a locked phone can't be changed from it).
 - "[ stock shade ]" in the panel opens the real Android shade if you need to clear a notification there.
 - Limits: (1) full-screen apps/games still show the bar on top - use the "bar" tile (or Edit home) to switch to
   "line only" for them. (2) The notification list is a log of what arrived; Android 2.3 gives no way to read or
   remove the real notification list, so "clear" only clears this list.
 - Brightness: sets the system value and the panel's own window; if the phone doesn't apply it until the next screen
   wake, that's the ROM.
 - Needs the overlay permission (granted on install on 2.3) and the Accessibility service for notification text.

EARBUD BUTTONS
 - Other players grab the headset/earbud buttons whenever they start. This player now keeps them: it re-claims them
   when your buds connect, on every screen-on, and stops giving them up when another app takes audio focus.
   Edit home > "Keep earbud buttons for this player" turns it off.
 - Earbud BATTERY %: not implemented, and not possible on Android 2.3 (the headset battery report needs a much newer
   Bluetooth stack). The only % in the app is the PHONE battery, in the bar and the panel header ("phone battery").

DOUBLE-TAP POWER = BACK
 - Detected as screen-off then screen-on within 0.65s, then sends BACK with root (su -c "input keyevent 4").
   It can take about a second on this phone because that command starts a whole Android process.
 - Skipped when the stock lock screen is showing, and when the lock mode is a terminal/music lock (mode 2-4),
   because BACK would just close that lock screen. If you see it acting like HOME, that is the cause: lock mode.
 - Edit home > "Double-tap power = back" turns it off.

DRAWER
 - The keyboard now pops up when the drawer opens (it retries, since the first attempt used to lose to the
   animation). Edit home > "Keyboard when drawer opens" turns it off. The drawer rises with a spring and the app rows
   glide in one after another.

ANIMATIONS
 - Player: cover pops in, title/artist glide up; all round buttons squash-and-bounce when tapped.
 - Panel: tiles have a springy press and a ripple when they flip; notification rows slide in staggered;
   the panel eases open/closed.
