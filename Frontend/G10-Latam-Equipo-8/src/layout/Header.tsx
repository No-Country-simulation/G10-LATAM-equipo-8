type Props = {
    title: string;

}

const Header = ({title}: Props) => {
  return (
    <>
    <h1 className="flex flex-col p-4 text-xl border">{title}</h1>
    </>
  )
}

export default Header