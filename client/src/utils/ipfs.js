import { create } from 'ipfs-http-client';

const projectId = process.env.REACT_APP_INFURA_IPFS_PROJECT_ID;
const projectSecret = process.env.REACT_APP_INFURA_IPFS_PROJECT_SECRET;
const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');

const client = create({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https',
  headers: {
    authorization: auth,
  },
});

export const uploadToIPFS = async (file) => {
  try {
    const added = await client.add(
      file,
      {
        progress: (prog) => console.log(`Upload progress: ${prog}`)
      }
    );
    return added.path;
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    throw new Error('Failed to upload to IPFS');
  }
};

export const getIPFSUrl = (hash) => {
  if (!hash) return '';
  if (hash.startsWith('ipfs://')) {
    hash = hash.replace('ipfs://', '');
  }
  return `https://ipfs.io/ipfs/${hash}`;
};