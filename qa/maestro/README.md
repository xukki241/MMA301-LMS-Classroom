# Maestro Android E2E

Run against the `Pixel_10` AVD after Auth/Core and Mongo are ready:

```powershell
maestro test qa/maestro
```

The flows are intentionally fail-closed: missing Maestro, emulator or backend is a failed gate, not a skipped acceptance result.
