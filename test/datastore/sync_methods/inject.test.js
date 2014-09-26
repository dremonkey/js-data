describe('DS.inject(resourceName, attrs[, options])', function () {
  it('should throw an error when method pre-conditions are not met', function () {
    assert.throws(function () {
      datastore.inject('does not exist', {});
    }, datastore.errors.NonexistentResourceError, 'does not exist is not a registered resource!');

    DSUtils.forEach(TYPES_EXCEPT_OBJECT, function (key) {
      assert.throws(function () {
        datastore.inject('post', key);
      }, datastore.errors.IllegalArgumentError, 'post.inject: "attrs" must be an object or an array!');
    });

    assert.throws(function () {
      datastore.inject('post', {});
    }, datastore.errors.RuntimeError, 'post.inject: "attrs" must contain the property specified by `idAttribute`!');
  });
  it('should inject an item into the store', function () {

    assert.equal(datastore.lastModified('post', 5), 0);
    assert.doesNotThrow(function () {
      assert.deepEqual(JSON.stringify(datastore.inject('post', p1)), JSON.stringify(p1));
    });
    assert.notEqual(datastore.lastModified('post', 5), 0);
    assert.isNumber(datastore.lastModified('post', 5));
  });
//  it('should get mad when primary keys are changed', function (done) {
//
//    assert.equal(datastore.lastModified('post', 5), 0);
//    assert.doesNotThrow(function () {
//      assert.deepEqual(datastore.inject('post', p1), p1);
//    });
//    assert.notEqual(datastore.lastModified('post', 5), 0);
//    assert.isNumber(datastore.lastModified('post', 5));
//
//    var post = datastore.get('post', 5);
//
//    post.id = 10;
//
//    datastore.digest();
//
//    setTimeout(function () {
//      assert.deepEqual('Doh! You just changed the primary key of an object! ' +
//        'I don\'t know how to handle this yet, so your data for the "post' +
//        '" resource is now in an undefined (probably broken) state.', $log.error.logs[0][0]);
//
//      done();
//    }, 50);
//  });
  it('should inject multiple items into the store', function () {

    assert.doesNotThrow(function () {
      assert.deepEqual(JSON.stringify(datastore.inject('post', [p1, p2, p3, p4])), JSON.stringify([p1, p2, p3, p4]));
    });

    assert.deepEqual(JSON.stringify(datastore.get('post', 5)), JSON.stringify(p1));
    assert.deepEqual(JSON.stringify(datastore.get('post', 6)), JSON.stringify(p2));
    assert.deepEqual(JSON.stringify(datastore.get('post', 7)), JSON.stringify(p3));
    assert.deepEqual(JSON.stringify(datastore.get('post', 8)), JSON.stringify(p4));
  });
  it('should inject relations', function () {
    // can inject items without relations
    datastore.inject('user', user1);
    datastore.inject('organization', organization2);
    datastore.inject('comment', comment3);
    datastore.inject('profile', profile4);

    assert.deepEqual(JSON.stringify(datastore.get('user', 1)), JSON.stringify(user1));
    assert.deepEqual(JSON.stringify(datastore.get('organization', 2)), JSON.stringify(organization2));
    assert.deepEqual(datastore.get('comment', 3).id, comment3.id);
    assert.deepEqual(datastore.get('profile', 4).id, profile4.id);

    // can inject items with relations
    datastore.inject('user', user10, 0);
    datastore.inject('organization', organization15);
    datastore.inject('comment', comment19);
    datastore.inject('profile', profile21);

    // originals
    assert.equal(datastore.get('user', 10).name, user10.name);
    assert.equal(datastore.get('user', 10).id, user10.id);
    assert.equal(datastore.get('user', 10).organizationId, user10.organizationId);
    assert.isArray(datastore.get('user', 10).comments);
    assert.deepEqual(datastore.get('organization', 15).name, organization15.name);
    assert.deepEqual(datastore.get('organization', 15).id, organization15.id);
    assert.isArray(datastore.get('organization', 15).users);
    assert.deepEqual(datastore.get('comment', 19).id, comment19.id);
    assert.deepEqual(datastore.get('comment', 19).content, comment19.content);
    assert.deepEqual(datastore.get('profile', 21).id, profile21.id);
    assert.deepEqual(datastore.get('profile', 21).content, profile21.content);

    // user10 relations
    assert.deepEqual(JSON.stringify(datastore.get('comment', 11)), JSON.stringify(datastore.get('user', 10).comments[0]));
    assert.deepEqual(JSON.stringify(datastore.get('comment', 12)), JSON.stringify(datastore.get('user', 10).comments[1]));
    assert.deepEqual(JSON.stringify(datastore.get('comment', 13)), JSON.stringify(datastore.get('user', 10).comments[2]));
    assert.deepEqual(JSON.stringify(datastore.get('organization', 14)), JSON.stringify(datastore.get('user', 10).organization));
    assert.deepEqual(JSON.stringify(datastore.get('profile', 15)), JSON.stringify(datastore.get('user', 10).profile));

    // organization15 relations
    assert.deepEqual(JSON.stringify(datastore.get('user', 16)), JSON.stringify(datastore.get('organization', 15).users[0]));
    assert.deepEqual(JSON.stringify(datastore.get('user', 17)), JSON.stringify(datastore.get('organization', 15).users[1]));
    assert.deepEqual(JSON.stringify(datastore.get('user', 18)), JSON.stringify(datastore.get('organization', 15).users[2]));

    // comment19 relations
    assert.deepEqual(JSON.stringify(datastore.get('user', 20)), JSON.stringify(datastore.get('comment', 19).user));
    assert.deepEqual(JSON.stringify(datastore.get('user', 19)), JSON.stringify(datastore.get('comment', 19).approvedByUser));

    // profile21 relations
    assert.deepEqual(JSON.stringify(datastore.get('user', 22)), JSON.stringify(datastore.get('profile', 21).user));
  });
  it('should find inverse links', function () {
    datastore.inject('user', { organizationId: 5, id: 1 });

    datastore.inject('organization', { id: 5 }, { linkInverse: true });

    assert.isObject(datastore.get('user', 1).organization);

    assert.isUndefined(datastore.get('user', 1).comments);

    datastore.inject('comment', { approvedBy: 1, id: 23 }, { linkInverse: true });

    assert.equal(1, datastore.get('user', 1).comments.length);

    datastore.inject('comment', { approvedBy: 1, id: 44 }, { linkInverse: true });

    assert.equal(2, datastore.get('user', 1).comments.length);
  });
  it('should inject cyclic dependencies', function () {
    datastore.defineResource({
      name: 'foo',
      relations: {
        hasMany: {
          foo: {
            localField: 'children',
            foreignKey: 'parentId'
          }
        }
      }
    });
    var injected = datastore.inject('foo', [{
      id: 1,
      children: [
        {
          id: 2,
          parentId: 1,
          children: [
            {
              id: 4,
              parentId: 2
            },
            {
              id: 5,
              parentId: 2
            }
          ]
        },
        {
          id: 3,
          parentId: 1,
          children: [
            {
              id: 6,
              parentId: 3
            },
            {
              id: 7,
              parentId: 3
            }
          ]
        }
      ]
    }]);

    assert.equal(injected[0].id, 1);
    assert.equal(injected[0].children[0].id, 2);
    assert.equal(injected[0].children[1].id, 3);
    assert.equal(injected[0].children[0].children[0].id, 4);
    assert.equal(injected[0].children[0].children[1].id, 5);
    assert.equal(injected[0].children[1].children[0].id, 6);
    assert.equal(injected[0].children[1].children[1].id, 7);

    assert.isDefined(datastore.get('foo', 1));
    assert.isDefined(datastore.get('foo', 2));
    assert.isDefined(datastore.get('foo', 3));
    assert.isDefined(datastore.get('foo', 4));
    assert.isDefined(datastore.get('foo', 5));
    assert.isDefined(datastore.get('foo', 6));
    assert.isDefined(datastore.get('foo', 7));
  });
});