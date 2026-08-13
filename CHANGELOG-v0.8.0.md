# V0.8.0

## Integrated Forecast + 100k Monte Carlo

- Integrated pregame Team Strength forecast pipeline
- Remaining scheduled game filtering
- 3-way probabilities from integrated features
- 100,000-iteration deterministic Monte Carlo pipeline
- Playoff cutoff probability
- Memory-safe Monte Carlo: samples are not retained unless requested
- Seeded reproducibility
- Forecast provenance through `asOf`
- Leakage/state filtering tests

## Data integrity

No current-season production probabilities are fabricated when full official season data is unavailable. The included 100k run is a deterministic integration fixture only.
