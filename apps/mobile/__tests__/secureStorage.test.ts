import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import {secureStorage} from '../src/lib/secureStorage';

const mockedKeychain = Keychain as jest.Mocked<typeof Keychain>;
const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('secureStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getItem() returns value from keychain when available', async () => {
    const jsonValue = JSON.stringify({access_token: 'abc'});
    mockedKeychain.getGenericPassword.mockResolvedValue({
      username: 'test-key',
      password: jsonValue,
    } as any);

    const result = await secureStorage.getItem('test-key');
    expect(result).toBe(jsonValue);
    expect(mockedKeychain.getGenericPassword).toHaveBeenCalledWith({
      service: 'test-key',
    });
  });

  it('getItem() falls back to AsyncStorage when keychain is empty', async () => {
    mockedKeychain.getGenericPassword.mockResolvedValue(false);

    const asyncValue = JSON.stringify({session: 'fallback'});
    mockedAsyncStorage.getItem.mockResolvedValue(asyncValue);

    const result = await secureStorage.getItem('missing-key');
    expect(result).toBe(asyncValue);
  });

  it('getItem() handles corrupt JSON by clearing keychain entry and falling through', async () => {
    // First call returns corrupt JSON, second call (after removal) returns false
    mockedKeychain.getGenericPassword
      .mockResolvedValueOnce({
        username: 'corrupt-key',
        password: '{not valid json!!!',
      } as any)
      .mockResolvedValueOnce(false);

    mockedAsyncStorage.getItem.mockResolvedValue(null);

    const result = await secureStorage.getItem('corrupt-key');

    // Should have called resetGenericPassword to clear the corrupt entry
    expect(mockedKeychain.resetGenericPassword).toHaveBeenCalledWith({
      service: 'corrupt-key',
    });
    // Falls through to AsyncStorage/migration, which returns null
    expect(result).toBeNull();
  });

  it('setItem() writes to keychain', async () => {
    mockedKeychain.setGenericPassword.mockResolvedValue(true);

    const value = JSON.stringify({token: 'secret'});
    await secureStorage.setItem('my-key', value);

    expect(mockedKeychain.setGenericPassword).toHaveBeenCalledWith(
      'my-key',
      value,
      {service: 'my-key'},
    );
    // When keychain write succeeds, AsyncStorage should NOT be called
    expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('removeItem() clears both keychain and AsyncStorage', async () => {
    mockedKeychain.resetGenericPassword.mockResolvedValue(true);
    mockedAsyncStorage.removeItem.mockResolvedValue(undefined);

    await secureStorage.removeItem('stale-key');

    expect(mockedKeychain.resetGenericPassword).toHaveBeenCalledWith({
      service: 'stale-key',
    });
    expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith('stale-key');
  });
});
