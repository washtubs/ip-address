require.paths.push('..');

var vows = require('vows'),
    assert = require('assert');

var v6 = require('ipv6').v6,
    BigInteger = require('../lib/node/bigint');

// A convenience function to convert a list of IPv6 address notations
// to v6.Address instances
function notations_to_addresses(notations) {
   var addresses = [];

   for (var i = 0; i < notations.length; i++) {
      addresses.push(new v6.Address(notations[i]));
   }

   return addresses;
}

/*
   Still to test:

   "2001:0000:4136:e378:8000:63bf:3fff:fdd2",
   "2001::CE49:7601:E866:EFFF:62C3:FFFE",
   "2001::CE49:7601:2CAD:DFFF:7C94:FFFE",
   "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
   "fedc:ba98:7654:3210:fedc:ba98:7654:3210",
   "2608:af09:30:0:0:0:0:134",
   "1080:0:0:0:8:800:200c:417a",
   "1080::8:800:200c:417a",
   "0:1:2:3:4:5:6:7",
   "7:6:5:4:3:2:1:0",
   "2608::3:5",
   "ffff::3:5",
   "::1",
   "0:0:0:0:0:0:0:0",
   "::",
   "ffff::",
   "0:0:0:0:1:0:0:0",
   "2608:af09:30::102a:7b91:c239b:baff",
*/

vows.describe('v6.Address').addBatch({
   'A correct address': {
      topic: new v6.Address('a::b'),

      'contains no uppercase letters': function(a) {
         assert.isFalse(/[A-Z]/.test(a.address));
      },
      'validates as correct': function(a) {
         assert.isTrue(a.isCorrect());
         assert.equal(a.correctForm(), 'a::b');
      }
   },

   'A canonical address': {
      topic: new v6.Address('000a:0000:0000:0000:0000:0000:0000:000b'),

      'is 39 characters long': function(a) {
         assert.equal(a.address.length, 39);
      },
      'validates as canonical': function(a) {
         assert.isTrue(a.isCanonical());
         assert.equal(a.canonicalForm(), '000a:0000:0000:0000:0000:0000:0000:000b');
      }
   },

   'A v4 in v6 address': {
      topic: new v6.Address('::192.168.0.1'),

      'validates': function(a) {
         assert.isTrue(a.isValid());
      }
   },

   'An address with a subnet': {
      topic: new v6.Address('a::b/48'),

      'validates': function (a) {
         assert.isTrue(a.isValid());
      },
      'parses the subnet': function (a) {
         assert.equal(a.subnet, '/48');
      },
      'is in its own subnet': function (a) {
         assert.isTrue(a.isInSubnet(new v6.Address('a::b/48')));
      },
      'is not in a another subnet': function (a) {
         assert.isTrue(a.isInSubnet(new v6.Address('a::c/48')));
      }
   },

   'An address with a zone': {
      topic: new v6.Address('a::b%abcdefg'),

      'validates': function (a) {
         assert.isTrue(a.isValid());
      },
      'parses the zone': function (a) {
         assert.equal(a.zone, '%abcdefg');
      }
   },

   'A Teredo address': {
      topic: new v6.Address('2001:0000:ce49:7601:e866:efff:62c3:fffe'),

      'validates as Teredo': function(a) {
         assert.isTrue(a.isTeredo());
      },
      'contains valid Teredo information': function(a) {
         var teredo = a.teredo();

         assert.equal(teredo.prefix, '2001:0000');
         assert.equal(teredo.server4, '206.73.118.1');
         assert.equal(teredo.flags, '1110100001100110');
         assert.equal(teredo.udpPort, '4096');
         assert.equal(teredo.client4, '157.60.0.1');
      }
   },

   'Invalid addresses': {
      topic: notations_to_addresses([
         'a:b:c:d:e:f:g:0', // Invalid characters
         'a:b', // Too few groups
         'a::b::c', // Too many elisions
         'ffff::ffff::ffff', // Too many elisions
         'a::g', // Invalid characters
         '-1', // Too few groups, invalid characters (but it's an integer)
         '::-1', // Invalid characters (but it's an integer)
         'a:aaaaa::', // An octet with too many characters
         'a:a:a:a:a:a:a:a:a', // Too many groups
         'ffff:', // One octet ending in a colon
         'ffgg:ffff:ffff:ffff:ffff:ffff:ffff:ffff' // Invalid characters in a canonical address
      ]),

      'do not validate': function (addresses) {
         for (var i = 0, a; a = addresses[i], i < addresses.length; i++) {
            assert.isFalse(a.isValid());
         }
      }
   },

   'Different notations of the same address': {
      topic: notations_to_addresses([
         "2001:db8:0:0:1:0:0:1",
         "2001:0db8:0:0:1:0:0:1",
         "2001:db8::1:0:0:1",
         "2001:db8::0:1:0:0:1",
         "2001:0db8::1:0:0:1",
         "2001:db8:0:0:1::1",
         "2001:db8:0000:0:1::1",
         "2001:DB8:0:0:1::1"
      ]),

      'are parsed to the same result': function (addresses) {
         for (var i = 0, a; a = addresses[i], i < addresses.length; i++) {
            assert.equal(a.correctForm(), '2001:db8::1:0:0:1');
            assert.equal(a.canonicalForm(), '2001:0db8:0000:0000:0001:0000:0000:0001');
            assert.equal(a.v4_form(), '2001:db8::1:0:0.0.0.1');
            assert.equal(a.decimal(), '08193:03512:00000:00000:00001:00000:00000:00001');
            assert.equal(a.binaryZeroPad(), '0010000000000001000011011011100000000000000000000000000000000000' +
               '0000000000000001000000000000000000000000000000000000000000000001');
         }
      }
   }
}).export(module);
