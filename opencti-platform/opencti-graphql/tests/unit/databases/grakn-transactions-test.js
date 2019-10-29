import uuid from 'uuid/v4';
import { getById, deleteById } from '../../../src/database/grakn';
import { addThreatActor } from '../../../src/domain/threatActor';

jest.setTimeout(60000);

test('grakn-transactions-test', async () => {
  const insertedIds = [];
  for (let i = 0; i < 500; i++) {
    const id = uuid();
    try {
      insertedIds.push(id);
      await addThreatActor(
        {},
        { name: `test${i}`, description: 'test', internal_id_key: id }
      );
    } catch (err) {}
  }
  const resultPromise = Promise.all(
    insertedIds.map(async id => {
      await getById(id, true);
      return deleteById(id);
    })
  );
  await Promise.resolve(resultPromise);
});
