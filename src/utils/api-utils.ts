export const fetchPincodeDetails = async (pincode: string) => {
  const PINCODE_ENDPOINT =
    process.env.NEXT_PUBLIC_MDM_SERVICE_URL + '/master/pincode/';

  if (!pincode) return;

  try {
    const filters = encodeURIComponent(JSON.stringify({ pincode }));
    const response = await fetch(`${PINCODE_ENDPOINT}data?filter=${filters}`);

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching pincode data:', error);
  }
};
