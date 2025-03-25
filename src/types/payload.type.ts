import Role from "./role.type";

type Payload = {
  id: number;
  role: Role;
  username: string;
  isShadowAdmin: boolean;
};

export default Payload;
