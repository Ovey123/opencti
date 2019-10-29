import uuid from 'uuid/v4';
import { getById, deleteById, graknNow } from '../../../src/database/grakn';
import { addThreatActor } from '../../../src/domain/threatActor';
import { addMalware } from '../../../src/domain/malware';
import { addStixRelation } from '../../../src/domain/stixRelation';

jest.setTimeout(60000);

test('grakn-transactions-test', async () => {
  const insertedThreatActorIds = [];
  for (let i = 0; i < 500; i++) {
    try {
      const threatActorId = uuid();
      await addThreatActor(
        {},
        {
          name: `test${i}`,
          description: 'test',
          internal_id_key: threatActorId
        }
      );
      insertedThreatActorIds.push(threatActorId);
      const malwareId = uuid();
      await addMalware(
        {},
        { name: `test${i}`, description: 'test', internal_id_key: malwareId }
      );
      await addStixRelation(
        {},
        {
          fromId: threatActorId,
          fromRole: 'user',
          toId: malwareId,
          toRole: 'usage',
          first_seen: graknNow(),
          last_seen: graknNow()
        }
      );
    } catch (err) {}
  }
  const getAndDeletePromise = Promise.all(
    insertedThreatActorIds.map(async id => {
      await getById(id, true);
      return deleteById(id);
    })
  );
  await Promise.resolve(getAndDeletePromise);
});
