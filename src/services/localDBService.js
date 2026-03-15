import { db } from '../db/localDB';
import { encrypt, decrypt } from '../utils/encryption';

/**
 * LocalDBService - Camada de serviço para acesso ao banco local
 *
 * Funcionalidades:
 * - CRUD com encriptação automática
 * - API similar ao Firebase para facilitar migração
 * - Queue de sync para sincronização com cloud (opcional)
 * - Suporte a queries reativas (Dexie observable)
 */

class LocalDBService {
  /**
   * Adicionar documento a uma coleção
   *
   * @param {string} collection - Nome da coleção
   * @param {object} data - Dados a guardar
   * @param {string} pin - PIN do utilizador para encriptação
   * @param {Uint8Array} salt - Salt do utilizador
   * @param {boolean} enableSync - Se deve sincronizar com cloud
   * @returns {Promise<number>} - ID do documento criado
   */
  async add(collection, data, pin, salt, enableSync = true) {
    try {
      // Encriptar dados sensíveis
      const encryptedData = await encrypt(data, pin, salt);

      // Adicionar metadados
      const document = {
        ...encryptedData,
        syncStatus: enableSync ? 'pending' : 'local-only',
        lastModified: new Date().toISOString(),
        encrypted: true
      };

      // Guardar no banco local
      const id = await db[collection].add(document);

      // Adicionar à fila de sync se ativado
      if (enableSync) {
        await this.addToSyncQueue(collection, id, 'create');
      }

      return id;
    } catch (error) {
      console.error(`Error adding to ${collection}:`, error);
      throw error;
    }
  }

  /**
   * Atualizar documento
   *
   * @param {string} collection - Nome da coleção
   * @param {number} id - ID do documento
   * @param {object} data - Novos dados
   * @param {string} pin - PIN do utilizador
   * @param {Uint8Array} salt - Salt do utilizador
   * @param {boolean} enableSync - Se deve sincronizar
   */
  async update(collection, id, data, pin, salt, enableSync = true) {
    try {
      // Encriptar novos dados
      const encryptedData = await encrypt(data, pin, salt);

      // Atualizar com metadados
      await db[collection].update(id, {
        ...encryptedData,
        syncStatus: enableSync ? 'pending' : 'local-only',
        lastModified: new Date().toISOString()
      });

      // Adicionar à fila de sync
      if (enableSync) {
        await this.addToSyncQueue(collection, id, 'update');
      }
    } catch (error) {
      console.error(`Error updating ${collection}:`, error);
      throw error;
    }
  }

  /**
   * Remover documento
   *
   * @param {string} collection - Nome da coleção
   * @param {number} id - ID do documento
   * @param {boolean} enableSync - Se deve sincronizar
   */
  async delete(collection, id, enableSync = true) {
    try {
      await db[collection].delete(id);

      // Adicionar à fila de sync
      if (enableSync) {
        await this.addToSyncQueue(collection, id, 'delete');
      }
    } catch (error) {
      console.error(`Error deleting from ${collection}:`, error);
      throw error;
    }
  }

  /**
   * Obter todos os documentos de uma coleção (desencriptados)
   *
   * @param {string} collection - Nome da coleção
   * @param {string} pin - PIN do utilizador
   * @param {Uint8Array} salt - Salt do utilizador
   * @returns {Promise<Array>} - Array de documentos desencriptados
   */
  async getAll(collection, pin, salt) {
    try {
      const encryptedDocs = await db[collection].toArray();

      // Desencriptar cada documento
      const decryptedDocs = await Promise.all(
        encryptedDocs.map(async (doc) => {
          try {
            const decryptedData = await decrypt(doc.data, doc.iv, pin, salt);
            return {
              id: doc.id,
              ...decryptedData,
              _meta: {
                syncStatus: doc.syncStatus,
                lastModified: doc.lastModified
              }
            };
          } catch (error) {
            console.error(`Failed to decrypt document ${doc.id}:`, error);
            return null;
          }
        })
      );

      // Filtrar documentos que falharam a desencriptação
      return decryptedDocs.filter((doc) => doc !== null);
    } catch (error) {
      console.error(`Error getting all from ${collection}:`, error);
      throw error;
    }
  }

  /**
   * Obter documento por ID
   *
   * @param {string} collection - Nome da coleção
   * @param {number} id - ID do documento
   * @param {string} pin - PIN do utilizador
   * @param {Uint8Array} salt - Salt do utilizador
   * @returns {Promise<object|null>} - Documento desencriptado ou null
   */
  async getById(collection, id, pin, salt) {
    try {
      const doc = await db[collection].get(id);
      if (!doc) return null;

      const decryptedData = await decrypt(doc.data, doc.iv, pin, salt);
      return {
        id: doc.id,
        ...decryptedData,
        _meta: {
          syncStatus: doc.syncStatus,
          lastModified: doc.lastModified
        }
      };
    } catch (error) {
      console.error(`Error getting ${collection}/${id}:`, error);
      return null;
    }
  }

  /**
   * Query com filtros
   *
   * @param {string} collection - Nome da coleção
   * @param {Function} filterFn - Função de filtro (aplicada APÓS desencriptação)
   * @param {string} pin - PIN do utilizador
   * @param {Uint8Array} salt - Salt do utilizador
   * @returns {Promise<Array>} - Documentos filtrados
   */
  async query(collection, filterFn, pin, salt) {
    const allDocs = await this.getAll(collection, pin, salt);
    return allDocs.filter(filterFn);
  }

  /**
   * Adicionar item à fila de sincronização
   *
   * @param {string} collection - Nome da coleção
   * @param {number} documentId - ID do documento
   * @param {string} operation - 'create' | 'update' | 'delete'
   */
  async addToSyncQueue(collection, documentId, operation) {
    await db.syncQueue.add({
      collection,
      documentId,
      operation,
      timestamp: new Date().toISOString(),
      retries: 0
    });
  }

  /**
   * Obter itens pendentes de sincronização
   *
   * @returns {Promise<Array>} - Itens na fila de sync
   */
  async getSyncQueue() {
    return await db.syncQueue.orderBy('timestamp').toArray();
  }

  /**
   * Limpar item da fila de sync (após sincronização bem-sucedida)
   *
   * @param {number} queueId - ID do item na fila
   */
  async clearFromSyncQueue(queueId) {
    await db.syncQueue.delete(queueId);
  }

  /**
   * Marcar documento como sincronizado
   *
   * @param {string} collection - Nome da coleção
   * @param {number} id - ID do documento
   */
  async markAsSynced(collection, id) {
    await db[collection].update(id, {
      syncStatus: 'synced',
      lastSynced: new Date().toISOString()
    });
  }

  /**
   * Subscrever a mudanças em tempo real (similar ao onSnapshot do Firebase)
   * Usa Dexie observable hooks
   *
   * @param {string} collection - Nome da coleção
   * @param {Function} callback - Função chamada quando há mudanças
   * @param {string} pin - PIN do utilizador
   * @param {Uint8Array} salt - Salt do utilizador
   * @returns {Function} - Função de cleanup (unsubscribe)
   */
  subscribe(collection, callback, pin, salt) {
    let isActive = true;

    // Função para carregar e notificar
    const loadAndNotify = async () => {
      if (!isActive) return;
      try {
        const data = await this.getAll(collection, pin, salt);
        callback(data);
      } catch (error) {
        console.error(`Error in subscription to ${collection}:`, error);
      }
    };

    // Carregar dados iniciais
    loadAndNotify();

    // Observar mudanças na coleção
    // Note: Dexie não tem built-in observables, então vamos usar polling
    // Para produção, considerar usar dexie-observable addon
    const intervalId = setInterval(loadAndNotify, 1000); // Poll every 1s

    // Retornar função de cleanup
    return () => {
      isActive = false;
      clearInterval(intervalId);
    };
  }
}

export const localDBService = new LocalDBService();
