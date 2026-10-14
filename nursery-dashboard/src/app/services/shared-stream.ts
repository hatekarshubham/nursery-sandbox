import {
  Observable,
  ReplaySubject,
  defer,
  map,
  share,
  tap,
  timer
} from 'rxjs';


// =========================================================
// SHARED LIVE STREAM
// =========================================================
//
// Why this exists
// ---------------
//
// Firestore bills one read for every document a listener
// loads. Before this helper, every screen started its own
// listener on products / inventory / categories etc., so
// opening three screens read the same collection three
// times.
//
// shareLiveStream() wraps a listener so that:
//
//  - All screens share ONE listener per collection.
//  - Late subscribers immediately get the latest data
//    (no extra Firestore read).
//  - The listener stays open for `graceMs` after the last
//    screen leaves, so moving between screens does not
//    close and reopen it.
//  - If the listener errors (for example after sign-out),
//    the stream resets and the next subscriber starts a
//    fresh listener.
//
// Data quality
// ------------
//
// This only affects what is DISPLAYED. Every stock change
// still re-reads the live document from the server inside
// a Firestore transaction, so a stale screen can never
// oversell stock.
//
// Debugging reads
// ---------------
//
// In the browser console run:
//
//   localStorage.setItem('debugReads', '1')
//
// then reload. Each listener logs when it opens and how
// many documents each snapshot holds.
//
// =========================================================

export const DEFAULT_LISTENER_GRACE_MS = 10 * 60 * 1000;


function debugReadsEnabled(): boolean {

  try {

    return localStorage.getItem('debugReads') === '1';

  } catch {

    return false;

  }

}


export function shareLiveStream<T>(
  label: string,
  source: () => Observable<T>,
  graceMs: number = DEFAULT_LISTENER_GRACE_MS
): Observable<T> {

  return defer(() => {

    if (debugReadsEnabled()) {

      console.debug(
        `[reads] listener opened: ${label}`
      );

    }

    return source();

  }).pipe(

    tap(value => {

      if (
        debugReadsEnabled() &&
        Array.isArray(value)
      ) {

        console.debug(
          `[reads] ${label}: snapshot with ${value.length} documents`
        );

      }

    }),

    share({

      connector:
        () => new ReplaySubject<T>(1),

      resetOnError: true,

      resetOnComplete: true,

      resetOnRefCountZero:
        () => timer(graceMs)

    }),

    // Every subscriber gets its OWN array, so a screen that
    // sorts or filters the list in place cannot change what
    // another screen sees.
    map(value =>
      Array.isArray(value)
        ? ([...value] as unknown as T)
        : value
    )

  );

}
