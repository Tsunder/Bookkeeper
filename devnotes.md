# Developer notes

Starting this document so we can move lengthy comments from the source files,
explaining some decision or gotcha or whatever, to this document instead.  Keep
the sources leaner.

## Building level estimation

Building production may be affected by...

* Alliance Territory
    - Class I diversity: Production boost for: Space Farm, Neural Laboratory.
    - Class R diversity: Production boost for: Smelting Facility, Electronics
      Facility
    - Class D diversity: Production boost for: Slave Camp, Dark Dome.
    - Class G diversity: Production boost for: Brewery, Medical Laboratory,
      Plastics Facility

* Special events
    - Neural Burst: "Doubled efficiency levels of Neural Laboratories", whatever
      this means.
    - Neural Chill: "Efficiency level of Neural Laboratories set to zero (= 50%
      production, 60% upkeep of base level)", whatever this means.

* TSS membership
    - "One less slave needed for upkeep of drug station and dark dome (due to
      being provided by TSS)."

* MO grid setting

Bookkeeper does not even try to account for any of these things.  Rather, it
tries to identify buildings that are "normal", i.e. those where upkeep and
production can be calculated from a formula and a set of "base values" (the vast
majority).  For normal buildings, only the building level is stored.  Otherwise,
the full set of seen upkeep/production values is stored, regardless of whatever
bonuses or penalties contributed to this anomaly.

So for this we need to know each building's production level, which is not
available from Pardus, except for the user's own buildings.  So we compute it
from the base values for buildings of a given type (which we know), and the
actual consumption and production of each tracked building (which we can see
from the trade screen).

Production commodities with base value 1 (like droids in DACs or drugs in DSs)
are ambiguous for this computation: production in odd levels stays the same as
in the previous even level, so the level can't be known based on seen production
alone.  For upkeep commodities, bases 1 and 2 are ambiguous: consumption may
stay the same for one, sometimes two consecutive levels.  For either, base
values above those are safe: we can get accurate results from them (in fact, the
commodity with the highest base value gives us the best estimation, because the
error introduced by the use of `round` in the Pardus formulae becomes less and
less significant with respect to the seen value).  And, happily, all Pardus
buildings at this time have at least one commodity for which either its base
upkeep or production is 3 or more.

And so, for any tracked building except the user's own, we compute the level as
above, and then we compute the expected upkeep and production with the Pardus
formulae.  If the result matches exactly whan we see on screen, we assume we got
the level correctly and store only that.  Otherwise, we deem the building
abnormal, set its tracked level as unknown, and store its seen upkeep and
production literally.

## Dictionaries of Id codes

We use dictionaries of numeric Id codes all over the app.  These are sometimes
handled as plain objects (instances of `Object`), and sometimes as arrays
(instances of `Array`).  It's important to be aware of the difference.

Javascript objects can be thought of as hash tables: you can store key-value
pairs in them, and have fast access to the values via the keys.  This is ideal
for catalogues of things keyed by an Id code.  However, object keys are always
strings (they become "property names"), and Javascript makes no guarantees about
order when enumerating the properties of an object.

Javascript arrays are just objects with integer keys.  Arrays provide fast
lookup of values, like regular objects, _and_ they also provide facilities to
enumerate elements in numeric order, as well as convenient methods for common
operations on collections of things (`find`, `map`, `reduce`, etc.).  Further,
no string-number conversions have to be performed when accessing these
"properties" with numeric keys.

Because of the above, we prefer to handle integer-keyed dictionaries as arrays,
rather than objects, whenever practicable.  However, objects have one advantage:
the Javascript syntax for object literals is clear and compact, whereas array
literals, when used this way, are cumbersome if not impossible to represent
(JSON simply cannot represent sparse arrays).  For instance, the base upkeep of
a Stim Chip Mill, a mapping of commodity Id codes to integer values, can be
written clearly and concisely as an object.  From the catalogue in building.js:

```js
{1:3, 3:3, 7:2, 17:2, 28:44}
```

An array would be more efficient and stuff, but the notation for the literal
would be awful:

```js
[,3,,3,,,,2,,,,,,,,,,2,,,,,,,,,,,44]
```

See that's exactly 11 commas between that "2" and the "44", because the former
is array index 17, and the latter is 28, and 28 - 17 = 11 (you wouldn't want to
see the literal for a Dark Dome, heh).  And no, this doesn't mean Javascript
would allocate space for 29 numbers to store this array; it's still only 5
values stored (arrays are "sparse"), it's just the syntax of literals that is
awkward.

So.  When using or implementing objects that operate on integer-keyed
dictionaries, do try to note which representation is used.  See comments on
methods of `Building`, for example.  And prefer arrays if you can choose.

## Firefox CSS workarounds

We detect Firefox in stylesheets by its support of `-moz-appearance`.  It's a
bit dirty because that is not actually the "feature" we're trying to detect, but
I currently know no better way around this.  The thing is: in Firefox, URLs in
our stylesheets are resolved relative to the extension's root, as opposed to the
page they're injected on in Chrome.  So, in Firefox, we use absolute URLs.  And
we link to the secure Pardus website because, otherwise, if the user is playing
over HTTPS, there'll be lots of warnings about _"Loading mixed (insecure)
display content"_ in the console.

So all this means that, if the user plays in Firefox, and not over HTTPS, Bookie
will (slightly wastefully) load a couple gifs from the secure site, that's all.

Additionally, we currently have a second `@supports` query to deal with current
Firefox's lack of unprefixed `min-content` and `max-content` in width rules.
That one is proper use of `@supports`, and when Firefox supports the unprefixed
keywords we'll just remove it.
